/* global google */
/* global _ */
/**
 * scripts.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Global JavaScript.
 */

// Google Map
var map;

// markers for map
var markers = [];

// info window
var info = new google.maps.InfoWindow();

// execute when the DOM is fully loaded
$(function() {

    // styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    var styles = [

        // hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}  
            ]
        },

        // hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}  
            ]
        }

    ];

    // options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    var options = {
        center: {lat: 39.5589, lng: -106.1332}, // Frisco, Colorado
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 17,    //was 14
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // get DOM node in which map will be instantiated
    var canvas = $("#map-canvas").get(0);

    // instantiate map
    map = new google.maps.Map(canvas, options);

    // configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);

});

/**
 * Adds marker for place to map.
 */
function addMarker(place)
{
    var geoIcon = getIcon(place);
    // Get co-ordinates of desired marker
    var myLatlng = new google.maps.LatLng(place.latitude,place.longitude);
    // Add marker to array
    markers.push(new MarkerWithLabel({ //alternative to google.maps.Marker
        position: myLatlng,
        labelContent: place.place_name,
        title: place.place_name,
        icon: geoIcon
    }));
    // Add marker to map
    var i = markers.length - 1;
    markers[i].setMap(map);
    
    // Some help sourced from: 
    // http://stackoverflow.com/questions/3059044/google-maps-js-api-v3-simple-multiple-marker-example
    google.maps.event.addListener(markers[i], 'click', (function(markers, i) 
    {
        return function() 
        {
            /** Currently supports the following countries:
             * 1. US
             * 2. AU
             * */
            var geoSearchCode = getGeoSearchCode(place);
            
            var parameters = {
                geo : geoSearchCode
            }
            $.getJSON( "articles.php", parameters, function( data ) 
            {
                var message = "<ul>";
                var n = data.length;
                if (n==0)
                {
                    message = "Slow news day!";
                }
                else
                {
                    for (var j = 0; j < n; j++)
                    {
                        var message = message + "<li><a href = " + data[j].link + ">" + data[j].title + "</a></li>";
                    }
                    message = message + "</ul>";
                    showInfo(markers[i],message);    // Need to add news here
                }
            });
        }
      })(markers, i));
}

/**
 * Configures application.
 */
function configure()
{
    // update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {
        update();
    });

    // update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // remove markers whilst dragging
    google.maps.event.addListener(map, "dragstart", function() {
        removeMarkers();
    });

    // configure typeahead
    // https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md
    $("#q").typeahead({
        autoselect: true,
        highlight: true,
        minLength: 2
    },
    {
        source: search,
        templates: {
            empty: "no places found yet",
            suggestion: _.template("<p><%- place_name %>, <%- admin_name1 %> <%- postal_code %> </p>")
        }
    });

    // re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // ensure coordinates are numbers
        var latitude = (_.isNumber(suggestion.latitude)) ? suggestion.latitude : parseFloat(suggestion.latitude);
        var longitude = (_.isNumber(suggestion.longitude)) ? suggestion.longitude : parseFloat(suggestion.longitude);

        // set map's center
        map.setCenter({lat: latitude, lng: longitude});

        // update UI
        update();
    });

    // hide info window when text box has focus
    $("#q").focus(function(eventData) {
        hideInfo();
    });

    // re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true; 
        event.stopPropagation && event.stopPropagation(); 
        event.cancelBubble && event.cancelBubble();
    }, true);

    // update UI
    update();

    // give focus to text box
    $("#q").focus();
}

/**
 * Hides info window.
 */
function hideInfo()
{
    info.close();
}

/**
 * Removes markers from map.
 */
function removeMarkers()
{
    var n = markers.length
    // Remove from map
    for (var i = 0; i < n; i++)
    {
        markers[i].setMap(null);
    }
    // Pop off array
    while (markers.pop() != undefined)
    {
        // Pop marker off array
    }
}

/**
 * Searches database for typeahead's suggestions.
 */
function search(query, cb)
{
    // get places matching query (asynchronously)
    var parameters = {
        geo: query
    };
    $.getJSON("search.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // call typeahead's callback with search results (i.e., places)
        cb(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {

        // log error to browser's console
        console.log(errorThrown.toString());
    });
}

/**
 * Shows info window at marker with content.
 */
function showInfo(marker, content)
{
    // start div
    var div = "<div id='info'>";
    if (typeof(content) === "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='img/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // end div
    div += "</div>";

    // set info window's content
    info.setContent(div);

    // open info window (if not already open)
    info.open(map, marker);
}

/**
 * Updates UI's markers.
 */
function update() 
{
    // get map's bounds
    var bounds = map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();

    // get places within bounds (asynchronously)
    var parameters = {
        ne: ne.lat() + "," + ne.lng(),
        q: $("#q").val(),
        sw: sw.lat() + "," + sw.lng()
    };
    $.getJSON("update.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // remove old markers from map
        removeMarkers();

        // add new markers to map
        for (var i = 0; i < data.length; i++)
        {
            addMarker(data[i]);
        }
     })
     .fail(function(jqXHR, textStatus, errorThrown) {

         // log error to browser's console
         console.log(errorThrown.toString());
     });
}

/** 
 * Function to select the icon to use based on location. 
 * Returns string with file name
 * **/
 
 function getIcon(place)
 {
     var icon;
     if (place.country_code == "AU")
     {
         icon = 'img/MC.jpg';
     }
     else
     {
         icon = 'img/KT.jpg';
     }
     return icon;
 }
 
 /** 
 * Function to select the icon to use based on location. 
 * Returns string with file name
 * **/
 function getGeoSearchCode(place)
 {
    var geoSearchCode;
    if (place.country_code == "AU")
    {
        geoSearchCode = place.place_name + ",+" + place.admin_code1 + ",+" + place.country_code;
    }
    else
    {
        geoSearchCode = place.postal_code;
    }
    return geoSearchCode;
 }