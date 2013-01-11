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

	function AddMovie(options) {
		this.settings = $.extend(true, {
			api: {
				url: 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey={{data.key}}&q={{data.query}}&page_limit={{data.limit}}',
				key: 'ROTTEN_TOMATOES_API_KEY',
				limit: 10,
				fields: {
					year: function(movie) {
						return movie.year;
					},
					link: function(movie) {
						return movie.links.alternate;
					},
					poster: function(movie) {
						return movie.posters.detailed;
					}
				}
			},
			form: {
				url: 'http://movies.aee.hm/jsonp.php?formkey={{data.key}}',
				key: 'SPREADSHEET_FORM_KEY',
				fields: {
					date:   '#entry_0',
					title:  '#entry_1',
					rating: '#entry_2',
					quote:  '#entry_3',
					genre:  '#entry_4',
					medium: '#entry_5',
					year:   '#entry_6',
					poster: '#entry_7',
					link:   '#entry_8'
				}
			},
			dateFormat: 'YYYY-MM-DD',
			datalistId: 'suggestions',
			dom: {
				container: '[data-role~="container"]',
				info:      '[data-role~="info"]',
				form:      '[data-role~="form"]'
			},
			tmpl: {
				
			},
			debug: false
		}, options);
		
		this.$dom = {
			title: null,
			date: null,
			datalist: $('<datalist />')
		};
	}
	
	AddMovie.prototype = {
		init: function() {
			var self = this,
				loadForm = this._getForm();
			
			this._prepareDom();
			
			this.$dom.form.addClass('state-loading');
			
			loadForm.done(function(data) {
				var $title, 
					$date, 
					$datalist = self.$dom.datalist,
					datalistId = _.uniqueId('datalist'),
					today = moment().format(self.settings.dateFormat);
				
				self.$dom.form.append(data.form);
				
				$title = self.$dom.title = $(self.settings.form.fields.title);
				$date = self.$dom.date = $(self.settings.form.fields.date);
				
				// Prepare datalist
				$title.attr({
					list: datalistId,
					autocomplete: 'off'
				});
				
				$datalist.insertAfter($title).attr('id', datalistId);
				
				// Bind enter keypress
				$title.on('keydown.suggest', function(event) {
					if ((event.keyCode || event.which) === 13 && !event.altKey) {
						event.preventDefault();
						
						var query = $title.val(),
							getSuggestions = self._getSuggestions(query);
						
						$title.addClass('state-loading');
						
						getSuggestions.done(function(data) {
							if (!_.has(data, 'movies')) {
								self._showError('Nothing returned from API');
								return;
							}
							
							self._showSuggestions(data.movies);
							self._clearError();
						}).fail(function() {
							self._showError('Error getting suggestions');
						}).always(function() {
							$title.removeClass('state-loading');
						});
					}
				});
				
				// Add datepicker
				$date.val(today).pikaday({
					format: self.settings.dateFormat
				});
			}).fail(function() {
				self._showError('Error loading form');
			}).always(function() {
				self.$dom.form.removeClass('state-loading');
			});
		},
		
		
		_getForm: function() {
			var settings = this.settings.form,
				tmpl = settings.url,
				data = {
					key: settings.key
				},
				url = _.template(tmpl, {
					data: data
				});

			return $.ajax({
				url: url,
				dataType: 'jsonp',
				timeout: 5000
			});
		},
		
		_getSuggestions: function(query) {
			var settings = this.settings.api,
				tmpl = settings.url,
				data = {
					key: settings.key,
					query: query,
					limit: settings.limit
				},
				url = _.template(tmpl, {
					data: data
				});

			return $.ajax({
				url: url,
				dataType: 'jsonp',
				timeout: 5000
			});
		},
		
		_showSuggestions: function(movies) {
			var self = this,
				$title = this.$dom.title,
				$datalist = this.$dom.datalist;
			
			if (movies.length === 0) return;
			
			_.each(movies, function(movie) {
				$('<option>'+ movie.title +'</option>').appendTo($datalist);
			});

			$title.addSwipeEvents().on('keydown.fill doubletap.fill', function(event) {
				if ((event.keyCode || event.which) === 13 && event.altKey || event.type === 'doubletap') {
					event.preventDefault();
					
					// Get movie with exactly the title provided
					var title = $title.val(),
						filtered = _.filter(movies, function(movie) {
							return movie.title == title; 
						});
					
					if (filtered.length === 0) {
						self._showError('No movie with title "'+ title +'" found');
						return;
					}
					
					self._fillForm(filtered[0]);
					
					$title.off('keydown.fill');

					self._clearError();
				}
			});
		},
		
		_fillForm: function(movie) {
			var self = this,
				apiFields = this.settings.api.fields,
				formFields = this.settings.form.fields;
			
			_.each(apiFields, function(getValue, key) {
				var formField = formFields[key],
					$field = self.$dom.form.find(formField),
					value = getValue(movie);

				$field.val(value);
			});
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


	window.AddMovie = AddMovie;

})(window, document, jQuery);