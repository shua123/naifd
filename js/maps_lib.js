/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 *
 */

// Enable the visual refresh
google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be depricated soon
  //fusionTableId:      "1iK_5ekxipPJyxyLreYX1YewUU4WE9PnZBT6jXzQ",
  fusionTableId:      "1fWJNwiy4bhG2TRbsNkZ8eZXuCRjaP1T8tMG7SYE",

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyDOGOewmVoa8Y7Okz_Nc1zNI36UzbOC0wY",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  locationColumn:     "latlong",
  //locationColumn:     "Geocode",

  map_centroid:       new google.maps.LatLng(41.00, -114), //center that your map defaults to
  locationScope:      "",      //geographical area appended to all address searches
  recordName:         "result",       //for showing number of results
  recordNamePlural:   "results",

  searchRadius:       40250,            //in meters
  defaultZoom:        3,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/blue-pushpin.png',
  currentPinpoint:    null,
  address:            "",
  counter:            0,

  initialize: function() {
    $( "#result_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          stylers: [
            { saturation: -70 },
            { lightness: 20 }
          ]
        }
      ]
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    
    
    MapsLib.infoWindow = new google.maps.InfoWindow();
    MapsLib.searchrecords = null;
    MapsLib.data = null;
    MapsLib.address = "";
    MapsLib.counter = 0;

    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($.address.parameter('radius'));
    if (loadRadius != "") $("#search_radius").val(loadRadius);
    else $("#search_radius").val(MapsLib.searchRadius);
    $(":checkbox").prop("checked", "checked");
    $("#result_box").hide();

    //-----custom initializers-------
    //$("#stateDD option:first").attr("selected", true);

    // map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(
    //     document.getElementById('legend'));
    
    $("#SearchType").val(0);
    MapsLib.SearchTypeChange(0);
    
    
    //-----end of custom initializers-------

    //run the default search
    MapsLib.doSearch();
  },

  doSearch: function(location) {
    MapsLib.clearSearch();
    MapsLib.address = $("#search_address").val();
    MapsLib.searchRadius = $("#search_radius").val();
    MapsLib.infoWindow.close(map);

    var whereClause = MapsLib.locationColumn + " not equal to ''";
    var sortColumn = "State_Province";

    //-----custom filters-------
    //statesearch = $("#stateDD").val();

    if ( $("#stateDD").val() != ''){
      whereClause += " AND 'State_Province' = '" + $("#stateDD").val() + "'";
      sortColumn = "City";
    }
    if ( $("#cityDD").val() != ''){
      whereClause += " AND 'City' = '" + $("#cityDD").val() + "'";
      sortColumn = "Facility_Name";
    }
    if ( $("#facilitytypeDD").val() != ''){
      whereClause += " AND 'col2\x3e\x3e0' = '" + $("#facilitytypeDD").val() + "'";
      sortColumn = "State_Province";
    }
    if ($("#search_name").val() != ''){
      search_name = $("#search_name").val().replace("'", "\\'");
      whereClause += " AND 'Facility_Name' CONTAINS IGNORING CASE '" + search_name + "'";
      sortColumn = "Facility_Name";
    }
    if ( $("#railroadDD").val() != ''){
      whereClause += " AND 'Railroad' = '" + $("#railroadDD").val() + "'";
      sortColumn = "State_Province";
    }

    //-------end of custom filters--------

    if (MapsLib.address != "") {
      sortColumn = "Facility_Name";
      if (MapsLib.address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        MapsLib.address = MapsLib.address + " " + MapsLib.locationScope;

      geocoder.geocode( { 'address': MapsLib.address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $.address.parameter('address', encodeURIComponent(MapsLib.address));
          $.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          //$.address.parameter('myparam', encodeURIComponent("Hello"));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(10);

          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint,
            map: map,
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:MapsLib.address
          });

          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, sortColumn, map, MapsLib.currentPinpoint);
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, sortColumn, map);
    }
  },

  submitSearch: function(whereClause, sortColumn, map, location) {
    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles
    MapsLib.counter += 1;
    
    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId: 2,
      templateId: 2,
      suppressInfoWindows: true
    });
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
    MapsLib.getList(whereClause, sortColumn);


    google.maps.event.addListener(MapsLib.searchrecords, 'click', function(e) {
          MapsLib.windowControl(e, MapsLib.infoWindow, map);
        });
  
  },

  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
    MapsLib.infoWindow.close(map);
    map.setCenter(MapsLib.map_centroid);
    map.setZoom(MapsLib.defaultZoom);
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  drawSearchRadiusCircle: function(point) {
      var circleOptions = {
        strokeColor: "#4b58a6",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: "#4b58a6",
        fillOpacity: 0.05,
        map: map,
        center: point,
        clickable: false,
        zIndex: -1,
        radius: parseInt(MapsLib.searchRadius)
      };
      MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
  },

  query: function(selectColumns, whereClause, sortColumn, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    queryStr.push(" WHERE " + whereClause);
    queryStr.push(" ORDER BY " + sortColumn);

    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    var sortColumn = "Count()";
    MapsLib.query(selectColumns, whereClause, sortColumn, "MapsLib.displaySearchCount");
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $( "#result_box" ).fadeOut(function() {
        $( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $( "#result_box" ).fadeIn();
  },

 

  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  },
  
  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above
  
  // Query the table for the columns specified in "selectColumns"
  getList: function(whereClause, sortColumn) {
    var selectColumns = "'col2\x3e\x3e0', Railroad, Facility_Name, Address1, Address2, City, State_Province, Postal_Code, Country, latlong, Telephone, Email, Web_URL, 'IANA Facility Code', 'SPLC Code'";
    MapsLib.query(selectColumns, whereClause, sortColumn, "MapsLib.displayList");
  },

  // Create the sidebar table. Column numbers correspond to the order of columns as selected in getList.
  displayList: function(json) {
    MapsLib.handleError(json);
    //var data = json["rows"];
    MapsLib.data =json["rows"];
    var template = "";

    var results = $("#results_list");
    results.hide().empty(); //hide the existing list and empty it out first

    if (MapsLib.data == null) {
      //clear results list
      results.append("<li><span class='lead'>No results found</span></li>");
    }
    else {
      template = "<table id='results-table' class='table table-bordered table-hover table-condensed'>";
      template = template.concat("<thead><tr><th>Type</th><th>Name</th><th>Location</th></tr></thead>");

      template = template.concat("<tbody>");
      for (var row in MapsLib.data) {
         template = template.concat("<tr onclick='javascript:MapsLib.openWindowTable(" + row + "); '><td>" + MapsLib.data[row][0] + "</td><td>" + MapsLib.data[row][2] + "</td><td>" + MapsLib.data[row][5] + ", " + MapsLib.data[row][6] + " " + MapsLib.data[row][8] + "</td></tr>");

      }
      // template = template.concat("<thead><tr><th>Type</th><th>Name</th><th>City</th><th>State</th><th>Country</th></tr></thead>");

      // template = template.concat("<tbody>");
      // for (var row in MapsLib.data) {
      //    template = template.concat("<tr onclick='javascript:MapsLib.openWindowTable(" + row + "); '><td>" + MapsLib.data[row][0] + "</td><td>" + MapsLib.data[row][2] + "</td><td>" + MapsLib.data[row][5] + "</td><td>" + MapsLib.data[row][6] + "</td><td>" + MapsLib.data[row][8] + "</td></tr>");

      // }
      template = template.concat("</tbody></table>");
      results.append(template);
      //If MapsLib.currentPinpoint is null, use first result record location
      if (( ($("#stateDD").val() != '') || ($("#cityDD").val() != '') ) && MapsLib.counter > 1){
          var thisCoordinate = MapsLib.data[0][9].split(",");
          centerLat = thisCoordinate[0];
          centerLong = thisCoordinate[1];
          newcenter = new google.maps.LatLng(centerLat,centerLong);
          map.setCenter(newcenter);
      }

      if ($("#stateDD").val() != ''){map.setZoom(5);}
      else if ($("#cityDD").val() != ''){map.setZoom(9);}

    }
    results.fadeIn();
  },

  // windowControl: Controls the window that displays when you click on a marker on the map.
  windowControl: function(e, infoWindow, map) {
    e.infoWindowHtml = "<div id='infowindow'>";
    e.infoWindowHtml += "<b>" + e.row['Facility_Name'].value + "</b><br>";
    e.infoWindowHtml += "<b>Facility Type: </b>" + e.row['Facility_Type'].value + "<br>";
    if (e.row['Railroad'].value != '' ) {
      e.infoWindowHtml += "<b>Servicing Railroad: </b>" + e.row['Railroad'].value + "<br>";
    }
    e.infoWindowHtml += "<b>Address: </b>" + e.row['Address1'].value + "<br>";
    if (e.row['Address2'].value != '' ) {
      e.infoWindowHtml += e.row['Address2'].value + "<br>";
    }
    e.infoWindowHtml += "<b>City: </b>" + e.row['City'].value + "<br>";
    e.infoWindowHtml += "<b>State or Province: </b>" + e.row['State_Province'].value + "<br>";
    e.infoWindowHtml += "<b>Postal Code: </b>" + e.row['Postal_Code'].value + "<br>";
    e.infoWindowHtml += "<b>Country: </b>" + e.row['Country'].value + "<br>";
    e.infoWindowHtml += "<b>Telephone: </b>" + e.row['Telephone'].value + "<br>";
    if (e.row['Email'].value != '' ) {
      e.infoWindowHtml += "<b>Email: </b><a href='mailto:" + e.row['Email'].value + "?subject=NAIFD Inquiry'>" + e.row['Email'].value + "</a><br>";
    }
    if (e.row['Web_URL'].value != '' ) {
      e.infoWindowHtml += "<b>Website: </b><a href='http://" + e.row['Web_URL'].value + "' target='_blank'>" + e.row['Web_URL'].value + "</a><br>";
    }
    if (e.row['IANA Facility Code'].value != '' ) {
      e.infoWindowHtml += "<b>IANA Facility Code: </b>" + e.row['IANA Facility Code'].value + "<br>";
    }
    if (e.row['SPLC Code'].value != '' && e.row['SPLC Code'].value != 'TBD'  ) {
      e.infoWindowHtml += "<b>SPLC Code: </b>" + e.row['SPLC Code'].value  + "<br>";
    }
    e.infoWindowHtml += "</div>";

    infoWindow.setOptions({
    content: e.infoWindowHtml,
    position: e.latLng,
    pixelOffset: e.pixelOffset
     });
    infoWindow.open(map);
  },

  // openWindowTable: The infowindow that opens when you click on a record in the table. Column nunmbers correspond to the order of columns selected in getList
  openWindowTable: function(row) {
    MapsLib.infoWindow.close(map);
    thisCoordinate = MapsLib.data[row][9].split(",");
    thisLocation = new google.maps.LatLng(thisCoordinate[0],thisCoordinate[1]);
    thisContent = "<div id='infowindow'>";
    thisContent += "<b>" + MapsLib.data[row][2] + "</b><br>";
    thisContent += "<b>Facility Type: </b>" + MapsLib.data[row][0] + "<br>";
    if (MapsLib.data[row][1] != '' ) {
      thisContent += "<b>Servicing Railroad: </b>" + MapsLib.data[row][1] + "<br>";
    }
    thisContent += "<b>Address: </b>" + MapsLib.data[row][3] + "<br>";
    if (MapsLib.data[row][4] != '' ) {
      thisContent += MapsLib.data[row][4] + "<br>";
    }
    thisContent += "<b>City: </b>" + MapsLib.data[row][5] + "<br>";
    thisContent += "<b>State or Province: </b>" + MapsLib.data[row][6] + "<br>";
    thisContent += "<b>Postal Code: </b>" + MapsLib.data[row][7] + "<br>";
    thisContent += "<b>Country: </b>" + MapsLib.data[row][8] + "<br>";
    thisContent += "<b>Telephone: </b>" + MapsLib.data[row][10] + "<br>";
    if (MapsLib.data[row][11] != '' ) {
      thisContent += "<b>Email: </b><a href='mailto:" + MapsLib.data[row][11]+ "?subject=NAIFD Inquiry'>" + MapsLib.data[row][11] + "</a><br>";
    }
    if (MapsLib.data[row][12] != '' ) {
      thisContent += "<b>Website: </b><a href='http://" + MapsLib.data[row][12] + "' target='_blank'>" + MapsLib.data[row][12] + "</a><br>";
    }
    if (MapsLib.data[row][13] != '' ) {
      thisContent += "<b>IANA Facility Code: </b>" + MapsLib.data[row][13] + "<br>";
    }
    if (MapsLib.data[row][14] != '' && MapsLib.data[row][14] != 'TBD') {
      thisContent += "<b>SPLC Code: </b>" + MapsLib.data[row][14] + "<br>";
    }
    thisContent += "</div>";
    MapsLib.infoWindow.setOptions({
      content: thisContent,
      position: thisLocation
    });
    map.setCenter(thisLocation);
    map.setZoom(10);
    MapsLib.infoWindow.open(map);

  },

  // Generic query for DropDowns
  queryDD: function(theColumns, callback){
    var selectColumns = theColumns + ", count()";
    var groupby = theColumns;
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    queryStr.push(" GROUP BY " + groupby);

    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});

  },

  // StateDropdown: Query to populate State/Province dropdown
  StateDropdown: function(json){
    MapsLib.handleError(json);
    var statedata = json["rows"];
    var stateDD = "<select id= 'stateDD' onchange='MapsLib.doSearch()' class=''>";
    stateDD += '<option value="">-- Select a State / Province --</option>';
    if (statedata == null) { 
      stateDD += "<option value ='Not Good'>Problem retrieving data. Please reload.</option>";
    }
    for (var row in statedata) {
      stateDD += "<option value='" + statedata[row][0] + "'>" + statedata[row][0] + "</option>";
    }
    stateDD += "</select>";
    $('#stateDD').html(stateDD);
  },

  CityDropdown: function(json){
    MapsLib.handleError(json);
    var citydata = json["rows"];
    var cityDD = "<select id= 'cityDD' onchange='MapsLib.doSearch()' class=''>";
    cityDD += '<option value="">-- Select a City --</option>';
    if (citydata == null) { 
      cityDD += "<option value ='Not Good'>Problem retrieving data. Please reload.</option>";
    }
    for (var row in citydata) {
      cityDD += "<option value='" + citydata[row][0] + "'>" + citydata[row][0] + "</option>";
    }
    cityDD += "</select>";
    $('#cityDD').html(cityDD);
  },

  FacilityTypeDropdown: function(json){
    MapsLib.handleError(json);
    var factypedata = json["rows"];
    var facilitytypeDD = "<select id= 'facilitytypeDD' onchange='MapsLib.doSearch()' class=''>";
    facilitytypeDD += '<option value="">-- Select a Facility Type --</option>';
    if (factypedata == null) { 
      facilitytypeDD += "<option value ='Not Good'>Problem retrieving data. Please reload.</option>";
    }
    for (var row in factypedata) {
      facilitytypeDD += "<option value='" + factypedata[row][0] + "'>" + factypedata[row][0] + "</option>";
    }
    facilitytypeDD += "</select>";
    $('#facilitytypeDD').html(facilitytypeDD);
  },

  RailroadDropdown: function(json){
    MapsLib.handleError(json);
    var railroaddata = json["rows"];
    var railroadDD = "<select id= 'railroadDD' onchange='MapsLib.doSearch()' class=''>";
    railroadDD += '<option value="">-- Select a Railroad --</option>';
    if (railroaddata == null) { 
      railroadDD += "<option value ='Not Good'>Problem retrieving data. Please reload.</option>";
    }
    for (var row in railroaddata) {
      railroadDD += "<option value='" + railroaddata[row][0] + "'>" + railroaddata[row][0] + "</option>";
    }
    railroadDD += "</select>";
    $('#railroadDD').html(railroadDD);
  },

  // GetNameList: Get Facility Names list for autocomplete
  GetNameList: function(json){
    MapsLib.handleError(json);
    var namedata = json["rows"];
    // Create the list of results for display of autocomplete.
    var namelist = [];
    for (var row in namedata) {
      namelist.push(namedata[row][0]);
    }
    // Use the results to create the autocomplete options.
    $('#search_name').autocomplete({
      source: namelist,
      minLength: 2,
      position: { my: "left bottom", at: "left top", collision: "flip" }
    });
  },

  // Script to show and hide forms. Also resets search
  SearchTypeChange: function(option){
    if (option == "0"){
      $("#stateDD").val('');
      $("#cityDD").val('');
      $("#search_name").val('');
      $("#facilitytypeDD").val('');
      $("#railroadDD").val('');
      $("#input-address").hide();
      $("#stateDD").hide();
      $("#cityDD").hide();
      $("#facilitytypeDD").hide();
      $("#input-name").hide();
      $("#railroadDD").hide();
    }
    else if (option == "1"){
      $("#cityDD").val('');
      $("#facilitytypeDD").val('');
      $("#search_name").val('');
      $("#railroadDD").val('');

      MapsLib.queryDD("State_Province", "MapsLib.StateDropdown");

      $("#stateDD").show();
      $("#stateDD").show();
      $("#input-address").hide();
      $("#cityDD").hide();
      $("#facilitytypeDD").hide();
      $("#input-name").hide();
      $("#railroadDD").hide();
    }
    else if (option == "2"){
      $("#stateDD").val('');
      $("#facilitytypeDD").val('');
      $("#search_name").val('');
      $("#railroadDD").val('');
      MapsLib.queryDD("City", "MapsLib.CityDropdown");

      $("#cityDD").show();
      $("#input-address").hide();
      $("#stateDD").hide();
      $("#facilitytypeDD").hide();
      $("#input-name").hide();
      $("#railroadDD").hide();
    }
    else if (option == "3"){
      $("#stateDD").val('');
      $("#cityDD").val('');
      $("#search_name").val('');
      $("#railroadDD").val('');
      MapsLib.queryDD("Facility_Type", "MapsLib.FacilityTypeDropdown");

      $("#facilitytypeDD").show();
      $("#input-address").hide();
      $("#stateDD").hide();
      $("#cityDD").hide();
      $("#input-name").hide();
      $("#railroadDD").hide();
    }
    else if (option == "4"){
      $("#stateDD").val('');
      $("#cityDD").val('');
      $("#facilitytypeDD").val('');
      $("#railroadDD").val('');
      MapsLib.queryDD("Facility_Name", "MapsLib.GetNameList");
      $("#input-name").show();
      $("#input-address").hide();
      $("#stateDD").hide();
      $("#cityDD").hide();
      $("#facilitytypeDD").hide();
      $("#railroadDD").hide();
    }
    else if (option == "5"){
      $("#stateDD").val('');
      $("#cityDD").val('');
      $("#facilitytypeDD").val('');
      $("#railroadDD").val('');
      $("#search_name").val('');
      $("#input-name").hide();
      $("#input-address").show();
      $("#stateDD").hide();
      $("#cityDD").hide();
      $("#facilitytypeDD").hide();
      $("#railroadDD").hide();
    }
    else if (option == "6"){
      $("#stateDD").val('');
      $("#cityDD").val('');
      $("#facilitytypeDD").val('');
      $("#search_name").val('');
      MapsLib.queryDD("Railroad", "MapsLib.RailroadDropdown");
      $("#input-name").hide();
      $("#input-address").hide();
      $("#stateDD").hide();
      $("#cityDD").hide();
      $("#facilitytypeDD").hide();
      $("#railroadDD").show();

    }
  }



  //-----end of custom functions-------
}
