<?php
    /**
     * Grabs Google spreadsheet form HTML and returns JSONP
     *
     * Requires $_REQUEST['formkey'] and $_REQUEST['callback']
     */
    
    define('SPREADSHEET_URL', 'https://spreadsheets.google.com/embeddedform?formkey=');


    function getData($url) {
        $ch = curl_init($url);
        
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        
        $html = curl_exec($ch);       
        
        curl_close($ch);

        return $html;
    }

    function getForm($html) {
        $formHtml = '';

        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);

        foreach ($xpath->query('//form') as $element) {
            $doc = new DOMDocument();
            $form = $element->cloneNode(TRUE);
            $doc->appendChild($doc->importNode($form, TRUE));

            $formHtml = str_replace("\n", '', $doc->saveHTML());

            break;
        }

        return $formHtml;
    }

    
    $key = $_GET['formkey'];
    $callback = $_GET['callback'];
    $data = array();

    if ($key) {
        $html = getData(SPREADSHEET_URL. $key);

        $data['form'] = getForm($html);
    } else {
        $data['message'] = 'No parameter provided.';
    }

    header("Content-Type: application/javascript");
    echo $callback .'('. json_encode($data) .')';
?>