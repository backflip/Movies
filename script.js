;(function(window, document, $, undefined) {
	"use strict";


	/**
	 * Use mustache syntax for underscore templates
	 */

	_.templateSettings = {
		interpolate: /\{\{(?!#)(.+?)\}\}/g,
		evaluate:    /\{\{#(.+?)\}\}/g
	};

	
	/**
	 * Core
	 */

	function ListMovies(options) {
		this.settings = $.extend(true, {
			spreadsheet: {
				url:    '{{data.protocol}}//spreadsheets.google.com/feeds/list/{{data.key}}/{{data.sheet}}/public/values?alt=json-in-script&callback=?',
				key:    'SPREADSHEET_KEY',
				sheet:  'SPREADSHEET_SHEET',
				fields: ['date', 'link', 'title', 'poster', 'rating', 'genre', 'year', 'quote', 'medium']
			},
			tmpl: {
				movie: '[data-tmpl~="movie"]'
			},
			dom: {
				container: '[data-role~="container"]',
				info:      '[data-role~="info"]',
				list:      '[data-role~="list"]'
			},
			dateFormat: 'Do MMMM',
			maxRating: 4
		}, options);
	
		this.movies = [];
		this.$dom = {};
	}
	
	ListMovies.prototype = {
		init: function() {
			var self = this,
				getMovies = this._get();
			
			this._prepareDom();

			this.$dom.container.addClass('state-loading');
			this.$dom.info.text('Loading data …');
			
			getMovies.done(function(data) {
				var entries = data.feed.entry;

				if (!entries) {
					self._showError('No feed entries returned');
					return;
				}
				
				self.movies = self._parse(entries);
				
				self._render();

				self._clearError();
			}).fail(function(data) {
				self._showError('Error getting feed');
			}).always(function() {
				self.$dom.container.removeClass('state-loading');
			});
		},
		
		
		_get: function() {
			var settings = this.settings.spreadsheet,
				tmpl = settings.url,
				data = {
					key: settings.key,
					sheet: settings.sheet,
					protocol: document.location.protocol
				},
				url = _.template(tmpl, {
					data: data
				});
		
			return $.ajax({
				url: url,
				dataType: 'jsonp',
				timeout: 10000
			}); 
		},
		
		_parse: function(entries) {
			var self = this,
				movies = [],
				fields = this.settings.spreadsheet.fields;
			
			_.each(entries, function(entry) {
				 var movie = {};
				
				_.each(fields, function(field) {
					movie[field] = self._extractData(entry, field);
					
					// Add stars
					if (field === 'rating') {
						movie['stars'] = self._getStarRating(movie['rating']);
					}
				});
				
				movies.push(movie);
			});
			
			movies = _.sortBy(movies, function(movie) {
				return moment(movie.date).format('YYYY-MM-DD');
			});
			
			return movies.reverse();
		},
		
		_extractData: function(entry, key) {
			var data = entry['gsx$'+ key];

			if (typeof data === 'object' && data.hasOwnProperty('$t')) {
				return data.$t;
			} else {
				return null;
			}
		},
		
		_getStarRating: function(rating) {
			var stars = '';
			
			for (var i = 0, len = this.settings.maxRating; i < len; i++) {
				if (i < rating) {
					stars += '★';
				} else {
					stars += '☆';
				}
			}
			
			return stars;
		},
		
		_render: function() {
			var movies = this.movies,
				dateFormat = this.settings.dateFormat,
				tmpl = $(this.settings.tmpl.movie).html(),
				html = '';

			$.each(movies, function() {
				this.date = moment(this.date).format(dateFormat);
				
				html += _.template(tmpl, {
					data: this
				});
			});
			
			this.$dom.list.append(html);
		},
		
		_prepareDom: function() {
			var $dom = this.$dom;
			
			$.each(this.settings.dom, function(key, selector) {
				$dom[key] = $(selector);
			});
		
		},
		
		_showError: function(message) {
			this.$dom.container.addClass('state-error');
			this.$dom.info.text(message);
		},
		_clearError: function() {
			this.$dom.container.removeClass('state-error');
			this.$dom.info.text('');
		}
	};


	window.ListMovies = ListMovies;

})(window, document, jQuery);
