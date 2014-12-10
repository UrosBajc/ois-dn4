var baseUrl = 'https://rest.ehrscape.com/rest/v1'; //povemo kje se nahaja funkcionlanost ehrscape pplatforme
var queryUrl = baseUrl + '/query'; 

var username = "ois.seminar"; 
var password = "ois4fri";
var ehrIzbranega = 0;// pacienti[0].ehrID;

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
var dataArray = [];

function getSessionId() {
    var response = $.ajax({ //ajax klic, poklicemo session povemo, kaj je nase username in passwd, v odgovor dobimo zetoncek, nek string, ki je casovno omejen-- nato vedno ko zahtevamo podatke, nastavimo ta string v header, da sterznik ve kdo smo
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


function napolniPaciente(){
    for(var i in pacienti){
        $('#izbiraPacientov').append("<option>"+pacienti[i].firstName + ' ' + pacienti[i].lastName+"</option>");    
    }
    
}

function podatki(vrsta) {
	$("#main").empty();
    if($("#mainData").length === 0){
    	$("#main").append("<div id='mainData'></div>");
    }
    else{
    	$("#mainData").empty();
    }
   	var ehr = ehrIzbranega;
    if(ehr != 0){
        var iskanje = "blood_pressure"; //je kao default
        if(vrsta === "visina")
        	iskanje = "height";
       
        sessionId =getSessionId();
		$.ajax({

		   	url: baseUrl + "/view/" + ehr + "/" + iskanje,//"body_temperature",
		   	limit: 8,
		    type: 'GET',
		    
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	if (res.length > 0) {
		    		var results = "<table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th>";
		    		if(vrsta === "tlak"){
		    			results += "<th class='text-left'>Sistolični</th><th class='text-right'>Diastolični</th></tr>";
		    		}
		    		else if (vrsta === "visina"){
		    			results += "<th class='text-right'>Višina</th></tr>";
		    		}
					console.log(res.length);
			        for (var i in res) {
			            //results += "<tr><td>" + res[i].time + "</td><td class='text-right'>" + res[i].temperature + " " 	+ res[i].unit + "</td>";
			            if(vrsta === "tlak"){
			            	results += "<tr><td>" + res[i].time + "</td>" +"<td>"+ res[i].systolic + "</td><td class='text-right'>" + res[i].diastolic + "</td>";
			            	//var x = new bloodPressure(res[i].time, res[i].systolic, res[i].diastolic);
			            //dataArray.push(x);
			            }
			            else if(vrsta === "visina"){
			            	console.log(res[i]);
			            	results += "<tr><td>" + res[i].time + "</td>" + "<td class='text-right'>" + res[i].height + "</td>"; //
			            }
			        }
			      
			        results += "</table>";
			        $("#mainData").append(results);
		    	} else {
		    		$("#mainData").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
		    	}
		    },
		    error: function(err) {
		    	$("#mainData").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		}); 
	
    }
}


function narisiGraf(){
    for(var i in dataArray){
        console.log(dataArray[i].systolic);
    }
    if($("#graf").val() === "") {
        $("#graf").remove();
        //$("#graf").html("<div id='joj'>" + new graph() + "</div>"); //new graph()
        
          $("#graf").html(new graph()); //new graph()  
         
    }
    else    {
        //console.log("----" + $("#joj").val());
        $("#graf").remove();
    }  
}


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
		    committer: "Meta" //???lahko brez????
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

function domov(){
	$("#main").empty();
	$("#main").append("<h2> Pozdravljeni na spletni strani o zdravju! <h2>");
	$("#main").append("<h4> Izberite pacienta: <h4>" + "<select class='form-control' id='izbiraPacientov'><option>-</option></select>");
	napolniPaciente();
	
	
	$('#izbiraPacientov').change(function(){
     	var pacient = $("#izbiraPacientov").val();
     	var izbran = pacient.split(" ");
    	var ime = izbran[0];
    	var priimek = izbran[1];
        for(var i in pacienti){
        if(pacienti[i].firstName === ime && pacienti[i].lastName === priimek){
            console.log(pacienti[i].ehrID);
            ehrIzbranega = pacienti[i].ehrID;
        }
		 }	
        if(pacient !== "-"){
        	$("#main").append("<div id='izbran'></div>");
        	if($("#izbran").length !==0 )
        		$("#izbran").empty();
        		
            $("#izbran").append("<h5><span style='color:blue'>Izbrali ste pacienta: " + pacient + "</span> </h5>");
            //$("#izbran").css({"border-style":"solid","font-size":"200%"});
            console.log("juhuhu");
        }
        else
            console.log("Izbrali ste -");
        
     });
	
	
	
}

function krvniTlak(){
	podatki("tlak");
	narisiGraf();
}

function visina(){
	podatki("visina");
}


$(document).ready(function(){
    napolniPaciente();
    domov();
 
});


var graph = function(){
	var margin = {top: 20, right: 80, bottom: 30, left: 50},
	    width = 960 - margin.left - margin.right,
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
	
	var svg = d3.select("body").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	var data = drugi;//tretji;//[{"date":"1980-11-30T10:30","Happy":"63.4","Sad":"62.7","Angry":"72.2"},{"date":"1981-11-30T10:30","Happy":"67.4","Sad":"61.7","Angry":"52.2"},{"date":"1982-11-30T10:30","Happy":"60.4","Sad":"84.7","Angry":"44.2"}];
	
	function n(error, data) {
	  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "datumInUra"; }));
	
	
	    d3.time.format("%Y-%m-%dT%H:%M");
	  data.forEach(function(d) {
	 d.datumInUra = parseDate(d.datumInUra);
	});
	
	  var cities = color.domain().map(function(name) {
	    return {
	      name: name,
	      values: data.map(function(d) {
	        return {date: d.datumInUra, temperature: +d[name]};
	      })
	    };
	  });
	
	  x.domain(d3.extent(data, function(d) { return d.datumInUra; }));
	
	  y.domain([
	    d3.min(cities, function(c) { return d3.min(c.values, function(v) { return v.temperature; }); }),
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



//-----------------------------pacienti
var pacienti = [
	{"firstName":"Shaq", "lastName":"ONeal","datumRojstva":"1979-11-30T10:58","ehrID":"e76015f6-ff50-4162-8d23-d015ac0caf60"},
	{"firstName":"Ciril", "lastName":"Kosmac","datumRojstva":"1965-1-3T01:16","ehrID":"a7d17b6c-f2f2-4818-8d29-7fbfbeb5bf7f"},
	{"firstName":"Lara","lastName":"Oblevrska","datumRojstva":"1990-6-20T16:00","ehrID":"1e3bf070-61bf-42b9-b101-ecc4806155e2"},
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