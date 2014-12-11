var baseUrl = 'https://rest.ehrscape.com/rest/v1'; //povemo kje se nahaja funkcionlanost ehrscape pplatforme
var queryUrl = baseUrl + '/query'; 

var username = "ois.seminar"; 
var password = "ois4fri";
var ehrIzbranega = 0; //ehrID pacienta, ki se ga izbere se zapise sem
var blood_pressure;

function patient(ehrID, firstName,lastName){
    this.ehrID = ehrID;
    this.firstName = firstName;
    this.lastName  = lastName;
}
function bloodPressure(date, systolic, diastolic){
    this.date = date;
    this.systolic = systolic;
    this.diastolic = diastolic;
}

var izbranoOkno = "domov";

function getSessionId() {
    var response = $.ajax({ //ajax klic, poklicemo session povemo, kaj je nase username in passwd, v odgovor dobimo zetoncek, nek string, ki je casovno omejen-- nato vedno ko zahtevamo podatke, nastavimo ta string v header, da sterznik ve kdo smo
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


function napolniPaciente(){ //napolni se dropdown meni s pacienti 
    for(var i in patientIDs){
    	zahtevajEHR(i);
        //$('#izbiraPacientov').append("<option>"+pacienti[i].firstName + ' ' + pacienti[i].lastName+"</option>");    
    }
    
}

function zahtevajEHR(i){
	var id = patientIDs[i].ehrID;
	console.log("zahteva:"+id);
	sessionId = getSessionId();

	if (!id || id.trim().length == 0) {
		$("#main").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!"); //tole odstrani
	} else {
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + id + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function (data) {
				var party = data.party;
				//$("#preberiSporocilo").html("<span class='obvestilo label label-success fade-in'>Bolnik '" + party.firstNames + " " + party.lastNames + "', ki se je rodil '" + party.dateOfBirth + "'.</span>");
				$('#izbiraPacientov').append("<option>"+party.firstNames + ' ' + party.lastNames +"</option>");    
				console.log("Bolnik '" + party.firstNames + " " + party.lastNames + "', ki se je rodil '" + party.dateOfBirth + "'."+id);
				patientIDs[i].firstName = party.firstNames;
				patientIDs[i].lastName = party.lastNames;
			},
			error: function(err) {
				$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
			}
		});
	}	
}

function podatki(vrsta) { //dobimo vrnjene podatke za katere smo poslali poizvedbo na ehrscape
	$("#main").empty();
    /*if($("#mainData").length === 0){
     	$("#main").append("<div id='mainData'></div>");
    } 
    else{
    	$("#mainData").empty();
    }*/
    var dataForGraph = [];
    sessionId =getSessionId();
   	var ehrID = ehrIzbranega;
    if(vrsta === "visina"){
    	$("#main").append("<h2>Podatki o višini</h2>");
    	var AQL = 
			"select "+
			    "a_a/data[at0001]/events[at0002]/time/value as time,"+
			    "a_a/data[at0001]/events[at0002]/data[at0003]/items[at0004, 'Body Height/Length']/value/magnitude as Body_Height_Length"+
			" from EHR e[e/ehr_id/value='" + ehrID + "']" +
			" contains COMPOSITION a"+
			" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.height.v1]"+
			"order by time desc";
		console.log(AQL);
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	var results = "<table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th><th class='text-right'>Višina</th></tr>";
		    	if (res) {
		    		var rows = res.resultSet;
			        for (var i in rows) {
			            results += "<tr><td>" + rows[i].time + "</td>" + "<td class='text-right'>" + rows[i].Body_Height_Length + "</td>";
			            //console.log(rows[i].time);
			            var index = rows[i].time.indexOf('.');//spreminjanje oblike datuma
			            var datum = rows[i].time.substring(0,index-3);//brez milisec
			            //console.log(datum);
			            dataForGraph.push({
			            	date : (datum).toString(), 
			            	visina : rows[i].Body_Height_Length
			            });
			        }
			        results += "</table>";
			        
			        narisiGraf(dataForGraph);
			        $("#main").append(results);
			       
		    	} else {
		    		$("#main").html("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
		    	}

		    },
		    error: function(err) {
		    	$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		});
    }
    else if(vrsta === "tlak"){
    	$("#main").append("<h2>Podatki o krvnem tlaku</h2>");
    	var AQL = 
			"select "+
			    "a_a/data[at0001]/events[at0006]/time/value as time,"+
			    "a_a/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude as Systolic,"+
			    "a_a/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude as Diastolic"+
			    " from EHR e[e/ehr_id/value='" + ehrID + "']" +
			" contains COMPOSITION a"+
			" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.blood_pressure.v1]"+
			"order by time desc";
		console.log(AQL);
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	var results = "<table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th><th class='text-left'>Sistolični</th><th class='text-right'>Diastolični</th></tr>";
		    	if (res) {
		    		var rows = res.resultSet;
			        for (var i in rows) {
			        	console.log(rows[i].Systolic);
			            results += "<tr><td>" + rows[i].time + "</td>" +"<td>"+ rows[i].Systolic + "</td><td class='text-right'>" + rows[i].Diastolic + "</td>";
			            
			            var index = rows[i].time.indexOf('.'); //spreminjanje oblike datuma
			            var datum = rows[i].time.substring(0,index-3);//brez milisec
			            //console.log(datum);
			            dataForGraph.push({
			            	date : (datum).toString(), 
			            	sistolicni : rows[i].Systolic,
			            	diastolicni : rows[i].Diastolic
			            });
			            
			            
			        }
			        results += "</table>";
			        narisiGraf(dataForGraph);
			        $("#main").append(results);
		    	} else {
		    		$("#main").html("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
		    	}

		    },
		    error: function(err) {
		    	$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		});
    }
    else if(vrsta === "teza"){
    	$("#main").append("<h2>Podatki o teži</h2>");
	   	var AQL = 
			"select "+
			    "a_a/data[at0002]/events[at0003]/time/value as time,"+
			    "a_a/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value/magnitude as Body_weight"+
			" from EHR e[e/ehr_id/value='" + ehrID + "']" +
			" contains COMPOSITION a"+
			" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.body_weight.v1]"+
			"order by time desc";
		console.log(AQL);
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	var results = "<table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th><th class='text-right'>Teža</th></tr>";
		    	if (res) {
		    		var rows = res.resultSet;
			        for (var i in rows) {
			        	console.log(rows[i].Systolic);
			        	results += "<tr><td>" + rows[i].time + "</td>" + "<td class='text-right'>" + rows[i].Body_weight + "</td>";
			        	
			            var index = rows[i].time.indexOf('.');//spreminjanje oblike datuma
			            var datum = rows[i].time.substring(0,index-3);//brez milisec
			            
			            dataForGraph.push({
			            	date : (datum).toString(), 
			            	teža : rows[i].Body_weight
			            });			        	
			        	
			        	
			        }
			        results += "</table>";
			       
			        narisiGraf(dataForGraph);
			        $("#main").append(results);
		    	} else {
		    		$("#main").html("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
		    	}

		    },
		    error: function(err) {
		    	$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		});
    }
}



function domov(){
	izbranoOkno = "domov";
	$("#main").empty();
	$("#main").append("<h2> Pozdravljeni na spletni strani o zdravju! <h2>");
	$("#main").append("<h4> Izberite pacienta: <h4>" + "<select class='form-control' id='izbiraPacientov'><option>-</option></select>");
	napolniPaciente();
	
	
	$('#izbiraPacientov').change(function(){
     	var pacient = $("#izbiraPacientov").val();
     	var izbran = pacient.split(" ");
    	var ime = izbran[0];
    	var priimek = izbran[1];
    	
    	for(var i in patientIDs){
        	if(patientIDs[i].firstName === ime && patientIDs[i].lastName === priimek){
	            console.log(patientIDs[i].ehrID);
	            ehrIzbranega = patientIDs[i].ehrID;
        	}
        }
    	
		 	
        if(pacient !== "-"){
        	$("#main").append("<div id='izbran'></div>");
        	if($("#izbran").length !==0 )
        		$("#izbran").empty();
        		
            //$("#izbran").append("<h5 class='bg-success'> </h5>");
            
           /* var sporocilo = "<div class='well'><span style='color:blue'>Izbrali ste pacienta: </span>"+
            			"<p>"+pacient+"</p></div>";*/
            			
            			
           	var sporocilo = "<div class='well'><div><i>Izbrali ste pacienta:</i></div><div><label class=' control-label'>Ime:&#160 </label><label class='control-label'> "+ime+"</label></div>"+
           					"<div><label class=' control-label'>Priimek:&#160 </label><label class='control-label'> "+priimek+"</label></div></div>";
            $("#izbran").append(sporocilo);//"<p class='well'><span style='color:blue'>Izbrali ste pacienta: " + pacient + "</span></p>")
            $("#izbran").css({"font-size":"110%"});
            console.log("dsadasd ---"+ehrIzbranega);
        }
        else
            console.log("Izbrali ste -");
        
     });

}

function preveriTlak(systolic,diastolic){
	var indexS = 0; 
	for(var i in blood_pressure.systolic){
		if(systolic >= blood_pressure.systolic[i].min && systolic <= blood_pressure.systolic[i].max){
			indexS = i;
			console.log(blood_pressure.systolic[i].name);
			break;
		}
	}
	var indexD = 0;
	for(var i in blood_pressure.diastolic){
		if(diastolic >= blood_pressure.diastolic[i].min && diastolic <= blood_pressure.diastolic[i].max){
			indexD = i;
			console.log(blood_pressure.diastolic[i].name);
			break;
		}
	}
	
	var izvid;
	//ce oba indexa 0 je kul, drugace vzemi slabso,vecjo vrednost
	if(indexS === 0 && indexD === 0){
		izvid = blood_pressure.systolic[0].name;
	}
	else{
		izvid = (indexS > indexD) ? blood_pressure.systolic[indexS].name : blood_pressure.diastolic[indexD].name;
	}
	
	$("#main").append("<div id='izvid'></div>");
	var fin = "<div class='well'><div><label class=' control-label'><i> Na zadnjem merjenju krvnega tlaka je pacient dosegel vrednosti: </i></label></div>"+
			"<div><label class=' control-label'>Sistolični tlak:&#160</label>"+systolic+"</div><div><label class=' control-label'>Diastolični tlak:&#160</label>"+diastolic+"</div>"+
			"<div><b>Končni izvid je, da ima pacient:&#160<ins>"+izvid+" </ins></b></div></div>";
	$("#izvid").append(fin);
	$("#izvid").css({"font-size":"110%"});
}


function pregled(){
	$("#main").empty();
	$("#main").append("<h2>Pregled zdravstenega stanja pacienta</h2>");
	//preveri ce je zadnji vnos tlaka nenormalen
	sessionId =getSessionId();
   	var ehrID = ehrIzbranega;
   	
	var AQL = 
		"select "+
		    "a_a/data[at0001]/events[at0006]/time/value as time,"+
		    "a_a/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude as Systolic,"+
		    "a_a/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude as Diastolic"+
		    " from EHR e[e/ehr_id/value='" + ehrID + "']" +
		" contains COMPOSITION a"+
		" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.blood_pressure.v1]"+
		" order by time desc"+
		" limit 1";
	console.log(AQL);
	$.ajax({
	    url: baseUrl + "/query?" + $.param({"aql": AQL}),
	    type: 'GET',
	    headers: {"Ehr-Session": sessionId},
	    success: function (res) {
	    	if (res) {
	    		var rows = res.resultSet;
		        // rows[i].time + "</td>" +"<td>"+ rows[i].Systolic + "</td><td class='text-right'>" + rows[i].Diastolic + "</td>";
		         preveriTlak(rows[0].Systolic, rows[0].Diastolic);

	    	} else {
	    		$("#main").html("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
	    	}

	    },
	    error: function(err) {
	    	$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
	    }
	});
	
	
}


function krvniTlak(){
	izbranoOkno = "tlak";
	podatki("tlak");
}

function visina(){
	izbranoOkno = "visina";
	podatki("visina");
}

function teza(){
	izbranoOkno = "teza";
	podatki("teza");
}




$(document).ready(function(){
    domov();
  	naloziJson();
});

function naloziJson(){
  $.getJSON( "blood_pressure.js", function( json ) {
	console.log( "JSON Data: " + json.systolic[2].max);
		blood_pressure = json;
	});	
}


function narisiGraf(data){
	$("#main").append("<div class='row' id='graf'><div>");
	$("#graf").html( new graph(data)); //new graph()  

}


//-----------------------------------------------------------------------------//
//				DODAJANJE PACIENTOV IN VITALNIH ZNAKOV
//-----------------------------------------------------------------------------//

function generirajPaciente(){ //nalozimo zavihek za generiranje pacientov
	//najprej dodamo paciente 
	$("#main").empty();
	$("#main").append("<div class='row'><h4 class='text-center'>Če želite ponovno dodati podatke o pacientih v bazo, kliknite gumb <i>Generiraj</i>.</h4></div>");
	$("#main").append("<div class='row'><center><button type='button' class='btn btn-warning btn-lg' onclick='dodajVBazo()'>Generiraj</button></center></div>");
}

function dodajVBazo(){ //se izvede v primeru da je bil kliknjen gumb Generiraj
	//najprej dodamo paciente
	for(var i in pacienti){
		generate(i);
	}
	
	//nato dodamo vitalne znake
	var ok = false;
	for(var i in prvi){
    	ok = dodajVitalneZnake(pacienti[0].ehrID,prvi[i]);
    	if(ok === false){
    		$("#main").append("<div class='row'><span class='obvestilo label label-danger fade-in'>Napaka!</span></div>");
    		break;
    	}
    }
    if(ok === true){ //ce je bilo vse vredu
    	$("#main").append("<div class='row'><h5 class='text-center'>Podatki uspesno dodani!</h5></div>");
    }
    ok= false;
    for(var i in drugi){
        ok = dodajVitalneZnake(pacienti[1].ehrID,drugi[i]);
        if(ok === false){
    		$("#main").append("<div class='row'><span class='obvestilo label label-danger fade-in'>Napaka!</span></div>");
    		break;
    	}
    }
    if(ok === true){ //ce je bilo vse vredu
    	$("#main").append("<div class='row'><h5 class='text-center'>Podatki uspesno dodani!</h5></div>");
    	napolniPaciente();
    }

	
	
}

function generate(i){
    sessionId = getSessionId(); 
    var ime = pacienti[i].firstName;
	var priimek = pacienti[i].lastName;
	var datumRojstva = pacienti[i].datumRojstva;
	console.log(ime);
	
	if (!ime || !priimek || !datumRojstva || ime.trim().length == 0 || priimek.trim().length == 0 || datumRojstva.trim().length == 0) { //preverimo ce je uporabnik sploh kaj vnesel
		$("#kreirajSporocilo").html("<span class='label label-warning'>Vnesi osnovne podatke o pacientu!</span>");
	} else {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId} //uporabimo žetoncek, ki smo ga dobili, nastavimo ga v headerje(tako imamo pravico dostopati do funkcionalnosti)
		});
		$.ajax({
		    url: baseUrl + "/ehr",
		    type: 'POST', //zahteva. ehrscape apiexplorer
		    success: function (data) {
		        var ehrId = data.ehrId; //streznik vrne ID s katerim lahko dodajamo stvari na streznik
		        var partyData = { //pripravimo podatke
		            firstNames: ime,
		            lastNames: priimek,
		            //gender: "MALE",
		            dateOfBirth: datumRojstva,
		            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
		        }; //ko imamo podatke klicemo demographics/party --za dan ehr id za nekega bolnika bomo dodali neke podatke
		        $.ajax({
		            url: baseUrl + "/demographics/party",
		            type: 'POST',
		            contentType: 'application/json',
		            data: JSON.stringify(partyData),
		            success: function (party) {
		                if (party.action == 'CREATE') {
		                	$("#main").append("<div class='row'><h4 class='text-center'>Uspešno kreiran EHR: " + ehrId + "</h4></div>");
		                    //$("#success").append("<span class='obvestilo label label-success fade-in'>Uspešno kreiran EHR '" + ehrId + "'.</span>");
		                    console.log("Uspešno kreiran EHR '" + ehrId + "'.");
		                    //$("#preberiEHRid").val(ehrId);
		                    console.log(ime);
		                    pacienti[i].ehrID = ehrId;
		                    console.log("prej: "+patientIDs[i]);
		                    patientIDs[i].ehrID = ehrId;
		                    console.log("potem: "+patientIDs[i]);
		                }
		            },
		            error: function(err) {
		            	//$("#kreirajSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
		            	console.log(JSON.parse(err.responseText).userMessage);
		            }
		        });
		    }
		});
	}
}


function dodajVitalneZnake(ehrID,data) {

	sessionId = getSessionId();
	//arhetipi:  (za zdruzevanje arhetipov naredimo template, predlogo --> mi naredimo predlogo vitalni znaki)
	console.log(ehrID);
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		var podatki = {
			// Preview Structure: https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
		    "ctx/language": "en",
		    "ctx/territory": "SI",
		    "ctx/time": data.datumInUra,
		    "vital_signs/height_length/any_event/body_height_length": data.telesnaVisina,
		    "vital_signs/body_weight/any_event/body_weight": data.telesnaTeza,
		   	"vital_signs/body_temperature/any_event/temperature|magnitude": data.telesnaTemperatura,
		    "vital_signs/body_temperature/any_event/temperature|unit": "°C",
		    "vital_signs/blood_pressure/any_event/systolic": data.sistolicniKrvniTlak,
		    "vital_signs/blood_pressure/any_event/diastolic": data.diastolicniKrvniTlak,
		    "vital_signs/indirect_oximetry:0/spo2|numerator": data.nasicenostKrviSKisikom
		};
		var parametriZahteve = {
		    "ehrId": ehrID,
		    templateId: 'Vital Signs',
		    format: 'FLAT',
		    //committer: "Meta" //???lahko brez????
		};
		$.ajax({
		    url: baseUrl + "/composition?" + $.param(parametriZahteve),
		    type: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(podatki),
		    success: function (res) {
		    	console.log(res.meta.href);
		        //$("#main").html("<span class='obvestilo label label-success fade-in'>" + res.meta.href + ".</span>")
		        return true;
		    },
		    error: function(err) {
		    	//$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
				return false;
		    }
		});
	
	
}
//-------------------------------------------------------------------------------


var graph = function(data){
	

	
	/*var margin = {top: 20, right: 80, bottom: 30, left: 50},
	     width = 960 - margin.left - margin.right,
	    height = 500 - margin.top - margin.bottom;*/
	    
    var margin = {top: 30, right: 80, bottom: 30, left: 50},
	   width = parseInt(d3.select('#graf').style('width'), 10) - margin.left - margin.right,
	  	height = 500 - margin.top - margin.bottom;
	  
	  
	
	var parseDate = d3.time.format("%Y-%m-%dT%H:%M").parse;
	
	var x = d3.time.scale()
	    .range([0, width]);
	
	var y = d3.scale.linear()
	    .range([height, 0]);
	
	var color = d3.scale.category10();
	
	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");
	
	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");
	
	var line = d3.svg.line()
	    .interpolate("basis")
	    .x(function(d) { return x(d.date); })
	    .y(function(d) { return y(d.temperature); });
	
	var svg = d3.select("#main").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	//var data = tretji;//[{"date":"1980-11-30T10:30","Happy":"63.4","Sad":"62.7","Angry":"72.2"},{"date":"1981-11-30T10:30","Happy":"67.4","Sad":"61.7","Angry":"52.2"},{"date":"1982-11-30T10:30","Happy":"60.4","Sad":"84.7","Angry":"44.2"}];
	
	function n(error, data) {
	  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));
	
	  data.forEach(function(d) {
	 d.date = parseDate(d.date);
	 console.log(d.date);
	});
	
	  var cities = color.domain().map(function(name) {
	    return {
	      name: name,
	      values: data.map(function(d) {
	        return {date: d.date, temperature: +d[name]};
	      })
	    };
	  });
	
	  x.domain(d3.extent(data, function(d) { return d.date; }));
	
	  y.domain([
	    d3.min(cities, function(c) { return d3.min(c.values , function(v) { return v.temperature; }); }), 
	    d3.max(cities, function(c) { return d3.max(c.values, function(v) { return v.temperature; }); })
	  ]);
	
	  svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxis);
	
	  svg.append("g")
	      .attr("class", "y axis")
	      .call(yAxis)
	    .append("text")
	      .attr("transform", "rotate(-90)")
	      .attr("y", 6)
	      .attr("dy", ".71em")
	      .style("text-anchor", "end")
	      .text("Vrednost");
	
	  var city = svg.selectAll(".city")
	      .data(cities)
	    .enter().append("g")
	      .attr("class", "city");
	
	  city.append("path")
	      .attr("class", "line")
	      .attr("d", function(d) { return line(d.values); })
	      .style("stroke", function(d) { return color(d.name); });
	
	  city.append("text")
	      .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
	      .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.temperature) + ")"; })
	      .attr("x", 3)
	      .attr("dy", ".35em")
	      .text(function(d) { return d.name; });
	}
	                         
	n([],data);
	

}

/*function resize() { NALOZI VECKRAT?????

	if(izbranoOkno === "visina"){
		$("#graf").html("");
		$("#graf").remove();
		visina();
		
	}
	else if(izbranoOkno === "tlak"){
		$("#graf").html("");
		$("#graf").remove();
		krvniTlak();
	}
	else if(izbranoOkno ==="teza"){
		$("#graf").html("");
		$("#graf").remove();
		teza();
	}
}*/



//-----------------------------pacienti-------------------------------------------
//var patientIDs = ["54c77109-775e-4f46-81c2-9cd32eb08f96","cad34540-40ae-4f39-ad96-56a4f9276126","a684c2d9-beef-43b4-9f4a-efeee8639238"];

//------------------zacasni podatki:---------------------------------------------
//ehrji--- na zacetku  pridobimo imena-nafilamo dropdown, na podlagi imen lahko potem iz dropdowna dostopamo do ehrjev
var patientIDs = [
	{"firstName":"","lastName":"","ehrID":"54c77109-775e-4f46-81c2-9cd32eb08f96"},
	{"firstName":"","lastName":"","ehrID":"cad34540-40ae-4f39-ad96-56a4f9276126"},
	{"firstName":"","lastName":"","ehrID":"a684c2d9-beef-43b4-9f4a-efeee8639238"},
];

//---------------------------trajni podatki:--------------
var pacienti = [
	{"firstName":"Shaq", "lastName":"ONeal","datumRojstva":"1979-11-30T10:58","ehrID":"54c77109-775e-4f46-81c2-9cd32eb08f96"},
	{"firstName":"Ciril", "lastName":"Kosmac","datumRojstva":"1965-1-3T01:16","ehrID":"cad34540-40ae-4f39-ad96-56a4f9276126"},
	{"firstName":"Lara","lastName":"Oblevrska","datumRojstva":"1990-6-20T16:00","ehrID":"a684c2d9-beef-43b4-9f4a-efeee8639238"},
];

var prvi = [
	{"datumInUra":"1980-11-30T10:30","telesnaVisina":"60","telesnaTeza":"5","telesnaTemperatura":"36","sistolicniKrvniTlak":"130","diastolicniKrvniTlak":"80","nasicenostKrviSKisikom":"95"},
	{"datumInUra":"1981-11-30T10:30","telesnaVisina":"70","telesnaTeza":"8","telesnaTemperatura":"35.9","sistolicniKrvniTlak":"122","diastolicniKrvniTlak":"77","nasicenostKrviSKisikom":"92"},
	{"datumInUra":"1983-11-30T10:30","telesnaVisina":"92","telesnaTeza":"14","telesnaTemperatura":"36.4","sistolicniKrvniTlak":"115","diastolicniKrvniTlak":"79","nasicenostKrviSKisikom":"96"},
	{"datumInUra":"1986-11-30T10:30","telesnaVisina":"110","telesnaTeza":"25","telesnaTemperatura":"36.2","sistolicniKrvniTlak":"115","diastolicniKrvniTlak":"79","nasicenostKrviSKisikom":"96"},
	{"datumInUra":"1989-11-30T10:30","telesnaVisina":"130","telesnaTeza":"38","telesnaTemperatura":"36.2","sistolicniKrvniTlak":"115","diastolicniKrvniTlak":"77","nasicenostKrviSKisikom":"97"},
	{"datumInUra":"1993-11-30T10:30","telesnaVisina":"146","telesnaTeza":"43","telesnaTemperatura":"36.1","sistolicniKrvniTlak":"111","diastolicniKrvniTlak":"82","nasicenostKrviSKisikom":"92"},
	{"datumInUra":"1995-04-30T10:30","telesnaVisina":"170","telesnaTeza":"59","telesnaTemperatura":"38.4","sistolicniKrvniTlak":"122","diastolicniKrvniTlak":"84","nasicenostKrviSKisikom":"96"},
	{"datumInUra":"1995-11-30T10:30","telesnaVisina":"174","telesnaTeza":"62","telesnaTemperatura":"36.1","sistolicniKrvniTlak":"130","diastolicniKrvniTlak":"84","nasicenostKrviSKisikom":"91"},
	{"datumInUra":"1996-11-30T10:30","telesnaVisina":"188","telesnaTeza":"67","telesnaTemperatura":"36.4","sistolicniKrvniTlak":"143","diastolicniKrvniTlak":"86","nasicenostKrviSKisikom":"94"},
	{"datumInUra":"1999-11-30T10:30","telesnaVisina":"189","telesnaTeza":"77","telesnaTemperatura":"36.4","sistolicniKrvniTlak":"140","diastolicniKrvniTlak":"90","nasicenostKrviSKisikom":"96"},
	{"datumInUra":"2000-11-30T10:30","telesnaVisina":"189","telesnaTeza":"86","telesnaTemperatura":"39.4","sistolicniKrvniTlak":"138","diastolicniKrvniTlak":"86","nasicenostKrviSKisikom":"97"},
	{"datumInUra":"2005-11-30T10:30","telesnaVisina":"189","telesnaTeza":"83","telesnaTemperatura":"36.4","sistolicniKrvniTlak":"144","diastolicniKrvniTlak":"85","nasicenostKrviSKisikom":"94"},
	
];

var drugi = [
	{"ehrId":"", "datumInUra":"1980-11-30T10:30","telesnaVisina":"182","telesnaTeza":"89","telesnaTemperatura":"36","sistolicniKrvniTlak":"111","diastolicniKrvniTlak":"80","nasicenostKrviSKisikom":"95"},
	{"ehrId":"", "datumInUra":"1990-11-30T10:30","telesnaVisina":"182","telesnaTeza":"90","telesnaTemperatura":"39.8","sistolicniKrvniTlak":"121","diastolicniKrvniTlak":"80","nasicenostKrviSKisikom":"95"},
	{"ehrId":"", "datumInUra":"1999-11-30T10:30","telesnaVisina":"182","telesnaTeza":"100","telesnaTemperatura":"36","sistolicniKrvniTlak":"125","diastolicniKrvniTlak":"83","nasicenostKrviSKisikom":"95"},
	{"ehrId":"", "datumInUra":"2000-11-30T10:30","telesnaVisina":"182","telesnaTeza":"107","telesnaTemperatura":"36.4","sistolicniKrvniTlak":"130","diastolicniKrvniTlak":"85","nasicenostKrviSKisikom":"93"},
	{"ehrId":"", "datumInUra":"2001-01-30T10:30","telesnaVisina":"182","telesnaTeza":"111","telesnaTemperatura":"36","sistolicniKrvniTlak":"146","diastolicniKrvniTlak":"92","nasicenostKrviSKisikom":"89"},
	{"ehrId":"", "datumInUra":"2001-11-30T10:30","telesnaVisina":"182","telesnaTeza":"112","telesnaTemperatura":"37","sistolicniKrvniTlak":"150","diastolicniKrvniTlak":"94","nasicenostKrviSKisikom":"91"},
	{"ehrId":"", "datumInUra":"2002-11-30T10:30","telesnaVisina":"182","telesnaTeza":"120","telesnaTemperatura":"36","sistolicniKrvniTlak":"142","diastolicniKrvniTlak":"89","nasicenostKrviSKisikom":"92"},
	{"ehrId":"", "datumInUra":"2003-11-30T10:30","telesnaVisina":"182","telesnaTeza":"105","telesnaTemperatura":"35.9","sistolicniKrvniTlak":"135","diastolicniKrvniTlak":"88","nasicenostKrviSKisikom":"96"},
	{"ehrId":"", "datumInUra":"2004-11-30T10:30","telesnaVisina":"182","telesnaTeza":"95","telesnaTemperatura":"36","sistolicniKrvniTlak":"133","diastolicniKrvniTlak":"87","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2005-11-30T10:30","telesnaVisina":"182","telesnaTeza":"91","telesnaTemperatura":"36","sistolicniKrvniTlak":"130","diastolicniKrvniTlak":"86","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2007-11-30T10:30","telesnaVisina":"181","telesnaTeza":"90","telesnaTemperatura":"36","sistolicniKrvniTlak":"132","diastolicniKrvniTlak":"85","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2008-11-30T10:30","telesnaVisina":"181","telesnaTeza":"88","telesnaTemperatura":"36","sistolicniKrvniTlak":"130","diastolicniKrvniTlak":"82","nasicenostKrviSKisikom":"97"},
];

var tretji = [
    {"date":"1980-11-30T10:30","telesnaVisina":"60","telesnaTeza":"5"},
	{"date":"1981-11-30T10:30","telesnaVisina":"70","telesnaTeza":"8"},
	{"date":"1983-11-30T10:30","telesnaVisina":"92","telesnaTeza":"14"},
	{"date":"1986-11-30T10:30","telesnaVisina":"110","telesnaTeza":"25"},
	{"date":"1989-11-30T10:30","telesnaVisina":"130","telesnaTeza":"38"},
	{"date":"1993-11-30T10:30","telesnaVisina":"146","telesnaTeza":"43"},
	{"date":"1995-04-30T10:30","telesnaVisina":"170","telesnaTeza":"59"},
	{"date":"1995-11-30T10:30","telesnaVisina":"174","telesnaTeza":"62"},
	{"date":"1996-11-30T10:30","telesnaVisina":"188","telesnaTeza":"67"},
	{"date":"1999-11-30T10:30","telesnaVisina":"189","telesnaTeza":"77"},
	{"date":"2000-11-30T10:30","telesnaVisina":"189","telesnaTeza":"86"},
	{"date":"2005-11-30T10:30","telesnaVisina":"189","telesnaTeza":"83"}

];