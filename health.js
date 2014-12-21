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


$(document).ready(function(){
    domov();
  	naloziJson();
});

function naloziJson(){
  $.getJSON( "zunanjiPodatki.js", function( json ) {
		blood_pressure = json;
	});	
}

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
				patientIDs[i].birthDate = party.dateOfBirth;
			},
			error: function(err) {
				$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
			}
		});
	}	
}

function podatki(vrsta) { //dobimo vrnjene podatke za katere smo poslali poizvedbo na ehrscape --> nato se izrise graf in izpise tabela vseh podatkov
	$("#main").empty();

    var dataForGraph = [];
    sessionId =getSessionId();
   	var ehrID = ehrIzbranega;
    if(vrsta === "visina"){
    	$("#main").append("<h2>Podatki o višini</h2>");
    	var AQL = 
			"select "+
			    "a_a/data[at0001]/events[at0002]/time/value as time,"+
			    "a_a/data[at0001]/events[at0002]/data[at0003]/items[at0004, 'Body Height/Length']/value/magnitude as Body_Height_Length,"+
			    "a_a/data[at0001]/events[at0002]/data[at0003]/items[at0004, 'Body Height/Length']/value/units as mera"+
			" from EHR e[e/ehr_id/value='" + ehrID + "']" +
			" contains COMPOSITION a"+
			" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.height.v1]"+
			"order by time desc";
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	var results = "</div><span class='label label-info'>Tabela s podatki o višini</span></div><table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th><th class='text-right'>Višina</th></tr>";
		    	if (res) {
		    		var rows = res.resultSet;
		    		var enota = "cm";
			        for (var i in rows) {
			            //results += "<tr><td>" + rows[i].time + "</td>" + "<td class='text-right'>" + rows[i].Body_Height_Length + " ("+rows[i].mera+") </td>";
			            
			            enota = rows[i].mera;
			            var index = rows[i].time.indexOf('.');//spreminjanje oblike datuma
			            var datum = rows[i].time.substring(0,index-3);//brez milisec
			            results += "<tr><td>" + datum + "</td>" + "<td class='text-right'>" + rows[i].Body_Height_Length + " ("+rows[i].mera+") </td>";
			            
			            dataForGraph.push({
			            	date : (datum).toString(), 
			            	višina : rows[i].Body_Height_Length
			            });
			        }
			        results += "</table>";
			        
			        narisiGraf(dataForGraph);
			        $("#main").append(results);
			       
		    	} else {
		    		$("#main").append("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
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
			    "a_a/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude as Diastolic,"+
			    "a_a/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/units as enota"+
			    " from EHR e[e/ehr_id/value='" + ehrID + "']" +
			" contains COMPOSITION a"+
			" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.blood_pressure.v1]"+
			"order by time desc";
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	var results = "</div><span class='label label-info'>Tabela s podatki krvnem tlaku</span></div><table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th><th class='text-left'>Sistolični</th><th class='text-right'>Diastolični</th></tr>";
		    	if (res) {
		    		var rows = res.resultSet;
		    		var mera;
			        for (var i in rows) {
			        	mera = rows[i].enota;
			            //results += "<tr><td>" + rows[i].time + "</td>" +"<td>"+ rows[i].Systolic +" ("+rows[i].enota+") </td><td class='text-right'>" + rows[i].Diastolic +" ("+rows[i].enota+") </td>";
			            
			            var index = rows[i].time.indexOf('.'); //spreminjanje oblike datuma
			            var datum = rows[i].time.substring(0,index-3);//brez milisec
			            results += "<tr><td>" + datum + "</td>" +"<td>"+ rows[i].Systolic +" ("+rows[i].enota+") </td><td class='text-right'>" + rows[i].Diastolic +" ("+rows[i].enota+") </td>";
			            
			            dataForGraph.push({
			            	date : (datum).toString(), 
			            	sistolični : rows[i].Systolic,
			            	diastolični : rows[i].Diastolic
			            });
			            
			            
			        }
			        results += "</table>";
			        narisiGraf(dataForGraph);
			        $("#main").append(results);
		    	} else {
		    		$("#main").append("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
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
			    "a_a/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value/magnitude as Body_weight,"+
			    "a_a/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value/units as enota"+
			" from EHR e[e/ehr_id/value='" + ehrID + "']" +
			" contains COMPOSITION a"+
			" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.body_weight.v1]"+
			"order by time desc";
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		    	var results = "</div><span class='label label-info'>Tabela s podatki o teži</span></div><table class='table  table-striped  table-hover table-bordered'><tr><th>Datum in ura</th><th class='text-right'>Teža</th></tr>";
		    	if (res) {
		    		var rows = res.resultSet;
		    		var mera;
			        for (var i in rows) {
			        	//results += "<tr><td>" + rows[i].time + "</td>" + "<td class='text-right'>" + rows[i].Body_weight +" ("+rows[i].enota+ ") </td>";
			        	mera = rows[i].enota;
			            var index = rows[i].time.indexOf('.');//spreminjanje oblike datuma
			            var datum = rows[i].time.substring(0,index-3);//brez milisec
			            results += "<tr><td>" + datum + "</td>" + "<td class='text-right'>" + rows[i].Body_weight +" ("+rows[i].enota+ ") </td>";
			            dataForGraph.push({
			            	date : (datum).toString(), 
			            	teža : rows[i].Body_weight
			            });			        	
			        }
			        results += "</table>";
			        narisiGraf(dataForGraph);
			        $("#main").append(results);
		    	} else {
		    		$("#main").append("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
		    	}

		    },
		    error: function(err) {
		    	$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		});
    }
}

function napisiZeIzbranega(){ //ce je pacient ze izbran in kliknemo domov, se izspisejo njegovi podatki
	var ime;
	var priimek;
	var rojstvo;
 	for(var i in patientIDs){
    	if(patientIDs[i].ehrID === ehrIzbranega){
            ime = patientIDs[i].firstName;
            priimek = patientIDs[i].lastName;
            rojstvo = patientIDs[i].birthDate;
    	}
    }
	$("#main").append("<div id='izbran'></div>");
	if($("#izbran").length !==0 )
		$("#izbran").empty();
	var index = rojstvo.indexOf('T');//spreminjanje oblike datuma
	rojstvo = rojstvo.substring(0,index);
   	var sporocilo = "<div class='well'><div><b><i>Trenutno izbrani pacient je:</i></b></div><div><label class=' control-label'>Ime:&#160 </label> "+ime+"</div>"+
   					"<div><label class=' control-label'>Priimek:&#160 </label> "+priimek+"</div>"+
   					"<div><label class=' control-label'>Datum rojstva:&#160 </label> "+rojstvo+"</div></div>";
    $("#izbran").append(sporocilo);
    $("#izbran").css({"font-size":"110%"});
}


function domov(){
	izbranoOkno = "domov";
	$("#main").empty();
	$("#main").append("<h2> Vaše zdravje-naša skrb! <h2><br>");
	$("#main").append("<h4> Izberite pacienta: <h4><br>" + "<select class='form-control' id='izbiraPacientov'><option>-</option></select><br>");
	napolniPaciente();
	if(ehrIzbranega !== 0){
		napisiZeIzbranega();
	}
	
	$('#izbiraPacientov').change(function(){ //ko se izbere pacienta
     	var pacient = $("#izbiraPacientov").val();
     	var izbran = pacient.split(" ");
    	var ime = izbran[0];
    	var priimek = izbran[1];
    	var rojstvo;
    	
    	for(var i in patientIDs){
        	if(patientIDs[i].firstName === ime && patientIDs[i].lastName === priimek){
	            console.log(patientIDs[i].ehrID);
	            ehrIzbranega = patientIDs[i].ehrID;
	            rojstvo = patientIDs[i].birthDate;
        	}
        }
    	
		 	
        if(pacient !== "-"){
        	var index = rojstvo.indexOf('T');//spreminjanje oblike datuma
			rojstvo = rojstvo.substring(0,index);
        	
        	$("#main").append("<div id='izbran'></div>");
        	if($("#izbran").length !==0 )
        		$("#izbran").empty();
			
           	var sporocilo = "<div class='well'><div><b><i>Izbrali ste pacienta:</i></b></div><div><label class=' control-label'>Ime:&#160 </label>"+ime+"</div>"+
           					"<div><label class=' control-label'>Priimek:&#160 </label> "+priimek+"</div>"+
           					"<div><label class=' control-label'>Datum rojstva:&#160 </label> "+rojstvo+"</div></div>";
            $("#izbran").append(sporocilo);//"<p class='well'><span style='color:blue'>Izbrali ste pacienta: " + pacient + "</span></p>")
            $("#izbran").css({"font-size":"110%"});
        }
        else
            console.log("Izbrali ste -");
        
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

function pregledPacienta(systolic,diastolic,enotaTlaka,bmi,bmiUnit){
	//najprej poiscemo v katero kategorijo spadata tlaka in bmi
	var indexS = 0; 
	for(var i in blood_pressure.systolic){
		if(systolic > blood_pressure.systolic[i].min && systolic <= blood_pressure.systolic[i].max){
			indexS = i;
			break;
		}
	}
	var indexD = 0;
	for(var i in blood_pressure.diastolic){
		if(diastolic > blood_pressure.diastolic[i].min && diastolic <= blood_pressure.diastolic[i].max){
			indexD = i;
		}
	}
	var indexB = 0; 
	for(var i in blood_pressure.bmi){
		if(bmi > blood_pressure.bmi[i].min && bmi <= blood_pressure.bmi[i].max){
			indexB = i;
			break;
		}
	}
	var problemSTlakom = 0;
	var izvid;
	//ce oba indexa 0 je kul, drugace vzemi slabso,vecjo vrednost
	if(indexS === 0 && indexD === 0){
		izvid = blood_pressure.systolic[0].name;
	}
	else{
		izvid = (indexS > indexD) ? blood_pressure.systolic[indexS].name : blood_pressure.diastolic[indexD].name;
		problemSTlakom = Math.max(indexS,indexD);
	}
	
	$("#main").append("<div id='izvid'></div>");
	var fin = "<div class='well'><div><label class=' control-label'><i> Na zadnjem merjenju krvnega tlaka je pacient dosegel naslednje vrednosti: </i></label></div>"+
			"<div><label class=' control-label'>Sistolični tlak:&#160</label>"+systolic+" ("+enotaTlaka+") </div><div><label class=' control-label'>Diastolični tlak:&#160</label>"+diastolic+" ("+enotaTlaka+")</div>"+
			"<div><b>Sklep:&#160<ins>"+izvid+" </ins></b></div></div>";
	$("#izvid").append(fin);
	bmi = bmi.toFixed(2);
	fin = "<div class='well'><label class=' control-label'><i> Pacientov indeks telesne teže je: </i></label> "+ bmi +" ("+bmiUnit+")<div><b>Sklep:&#160<ins>"+blood_pressure.bmi[indexB].name+ "</ins></b></div></div>";
	$("#izvid").append(fin);
	
	//glede na krvni pritisk in index telesne mase na zadnjem merjenju, se potem poda diagnoza.
	var sklep;
	if(problemSTlakom >=3){
		if(indexB > 2){
			sklep = "Zaradi močno povečanega krvnega tlaka in problemov s prekomerno telesno težo se predlaga <ins>takojšnji</ins> obisk zdravnika (Zdravnika si lahko najdete "+
			"na spletni strani <a href='http://zdravniki.org/zdravniki'>zdravniki.org</a>). Obstaja <ins>velika verjetnost</ins> za srčni infarkt, za obolelostjo za boleznimi srca in ožilja, sladkorno boleznijo..."+
			" Več informacij o možnih težavah lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container' style='width:100%'><iframe width='560' height='315' src='//www.youtube.com/embed/diG519dFVNs?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
		else if(indexB > 1){
			sklep = "Zaradi močno povečanega krvnega tlaka in malce prevelike telesne teže se predlaga obisk zdravnika, obenem pa <ins>korenita</ins> sprememba prehrambenih navad in ukvarjanje s športom."+
			" Več informacij o možnih težavah lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container' style='width:100%'><iframe width='560' height='315' src='//www.youtube.com/embed/diG519dFVNs?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
		else if (indexB == 1){
			sklep = "Zaradi močno povečanega krvnega tlaka se predlaga izogibanje stresnim situacijam. Priporočen je obisk zdravnika."+
			" Več informacij o možnih težavah lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container' style='width:100%'><iframe width='560' height='315' src='//www.youtube.com/embed/diG519dFVNs?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
		else{
			sklep = "Zaradi močno povečanega krvnega tlaka in premajhne telesne teže se predlaga obisk zdravnika, potrebna je korenita sprememba prehrambenih navad.";
			sklep += "<div class='video-container' style='width:100%'><iframe width='560' height='315' src='//www.youtube.com/embed/eMVyZ6Ax-74?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
	}
	else if(problemSTlakom >= 2){
		if(indexB > 2){
			sklep = "Zaradi povečanega krvnega tlaka in problemov s prekomerno telesno težo se predlaga <ins>takojšnji</ins> obisk zdravnika (Zdravnika si lahko najdete "+
			"na spletni strani <a href='http://zdravniki.org/zdravniki'>zdravniki.org</a>). Obstaja <ins>velika verjetnost</ins> za obolelostjo za boleznimi srca in ožilja, sladkorno boleznijo..."+
			"Več informacij o možnih težavah lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container'><iframe width='560' height='315' src='//www.youtube.com/embed/diG519dFVNs?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
		else if(indexB > 1){
			sklep = "Zaradi povečanega krvnega tlaka in malce prevelike telesne teže se predlaga <ins>korenito</ins> spremeniti prehrambene navade in začeti ukvarjati se s športom. Priporočen je obisk zdravnika."+
			"Več informacij o možnih rešitvah lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container'><iframe width='560' height='315' src='//www.youtube.com/embed/0aNNYEUARAk' frameborder='0' allowfullscreen></iframe></div>";
		
		}
		else if (indexB == 1){
			sklep = "Zaradi povečanega krvnega tlaka se predlaga izogibanje stresnim situacijam."+
			"Več informacij o možnih rešitvah si lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container'><iframe width='560' height='315' src='//www.youtube.com/embed/0aNNYEUARAk' frameborder='0' allowfullscreen></iframe></div>";
		}
		else{
			sklep = "Zaradi povečanega krvnega tlaka in premajhne telesne teže je zaželjena sprememba prehrambenih navad. Priporočen je obisk zdravnika.  Več informacij o možnih težavah lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container' style='width:100%'><iframe width='560' height='315' src='//www.youtube.com/embed/eMVyZ6Ax-74?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
	}
	else{
		if(indexB > 2){
			sklep = "Zaradi problemov s prekomerno telesno težo se predlaga obisk zdravnika. Obstaja verjetnost za obolelost za boleznimi srca in ožilja, sladkorno boleznijo... Več informacij o možnih težavah si lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container'><iframe width='560' height='315' src='//www.youtube.com/embed/h0zD1gj0pXk' frameborder='0' allowfullscreen></iframe></div>";
			
		}
		else if(indexB > 1){
			sklep = "Zaradi malce prevelike telesne teže se predlaga ukvarjanje s športom."+
			"Več informacij o možnih rešitvah si lahko najdete v spodnjem videu.";
			sklep += "<div class='video-container'><iframe width='560' height='315' src='//www.youtube.com/embed/0aNNYEUARAk' frameborder='0' allowfullscreen></iframe></div>";
		}
		else if (indexB == 1){
			sklep = "S pacientovim zdravjem je vse v najlepšem redu!";
		}
		else {
			sklep = "Zaradi premajhne telesne teže so zaželjene manjše spremembe prehrambenih navad. Več informacij o možnih težavah lahko najdete v spodnjem videu."
			sklep += "<div class='video-container' style='width:100%'><iframe width='560' height='315' src='//www.youtube.com/embed/eMVyZ6Ax-74?rel=0' frameborder='0' allowfullscreen></iframe></div>";
		}
	}
	$("#izvid").append("<div class='well' style='background-color:#e3e4e1'><h4><b><i>Končen sklep je:</i> </b></h4><i>"+sklep+"</i></div>");
	$("#izvid").css({"font-size":"110%"});
	

	
}

function pregled(){
	izbranoOkno="pregled";
	$("#main").empty();
	$("#main").append("<h2>Pregled zdravstenega stanja pacienta</h2>");
	//preveri kaksni so zadnji vnosi
	sessionId =getSessionId();
   	var ehrID = ehrIzbranega;
   	
	var AQL = 	
		"select "+
		    "a_a/data[at0001]/events[at0002]/time as time,"+
		    "a_a/data[at0001]/events[at0002]/data[at0003]/items[at0004]/value/magnitude as Body_Mass_Index,"+
		    "a_a/data[at0001]/events[at0002]/data[at0003]/items[at0004]/value/units as bmiUnit,"+
		    "a_b/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude as Systolic,"+
		    "a_b/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude as Diastolic,"+
		    "a_b/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/units as enota"+
		" from EHR e[e/ehr_id/value='" + ehrID + "']" +
		" contains COMPOSITION a"+
		" contains ("+
		    " OBSERVATION a_a[openEHR-EHR-OBSERVATION.body_mass_index.v1] and"+
		    " OBSERVATION a_b[openEHR-EHR-OBSERVATION.blood_pressure.v1])"+
		" order by time desc"+
		" limit 1";
	
	$.ajax({
	    url: baseUrl + "/query?" + $.param({"aql": AQL}),
	    type: 'GET',
	    headers: {"Ehr-Session": sessionId},
	    success: function (res) {
	    	if (res) {
	    		var rows = res.resultSet;
		         pregledPacienta(rows[0].Systolic, rows[0].Diastolic,rows[0].enota,rows[0].Body_Mass_Index,rows[0].bmiUnit);

	    	} else {
	    		$("#main").append("<h2><span class='obvestilo label label-warning fade-in'>Najprej izberite pacienta. (Domov > Izberi pacienta)</span></h2>");
	    	}

	    },
	    error: function(err) {
	    	$("#main").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
	    }
	});
	
	
}




//-----------------------------------------------------------------------------//
//				DODAJANJE PACIENTOV IN VITALNIH ZNAKOV
//-----------------------------------------------------------------------------//

function generirajPaciente(){ //nalozimo zavihek za generiranje pacientov
	izbranoOkno ="generator";
	//najprej dodamo paciente 
	$("#main").empty();
	$("#main").append("<div class='row'><h4 class='text-center'>Če želite ponovno dodati podatke o pacientih v bazo, kliknite gumb <i>Generiraj</i>.</h4></div>");
	$("#main").append("<div class='row'><center><button type='button' class='btn btn-warning btn-lg' onclick='dodajVBazo()'>Generiraj</button></center></div>");
}

function dodajVBazo(){ //se izvede v primeru da je bil kliknjen gumb Generiraj
	//najprej dodamo paciente
	for(var i in patientIDs){ //prej je bilo pacienti
		generate(i);
	}
	$("#main").append("<div id='loading'><h4 class='text-center'><span class='label label-warning'>Nalagam vitalne znake...</span></h4></div>");
	//nato dodamo vitalne znake
	
	for(var i in prvi){
    	dodajVitalneZnake(patientIDs[0].ehrID,prvi[i]);//prej je bilo pacienti
    }
    
  
    for(var i in drugi){
		dodajVitalneZnake(patientIDs[1].ehrID,drugi[i]);//prej je bilo pacienti
    }
    
  	for(var i in tretji){
		dodajVitalneZnake(patientIDs[2].ehrID,tretji[i]);//prej je bilo pacienti
    }
	$("#loading").remove();
	$("#main").append("<div class='row'><h4 class='text-center'><span class='label label-success'>Podatki uspesno dodani!</span></h4></div>");
	napolniPaciente();
}

function generate(i){
	ehrIzbranega = 0;
    sessionId = getSessionId(); 
    var ime = pacienti[i].firstName;
	var priimek = pacienti[i].lastName;
	var datumRojstva = pacienti[i].datumRojstva;
	
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
	                	$("#main").append("<div class='row'><h4 class='text-center'><span class='label label-success'>Uspešno kreiran EHR: " + ehrId + "</span></h4></div>");
	                    console.log("Uspešno kreiran EHR '" + ehrId + "'.");
	                    pacienti[i].ehrID = ehrId;
	                    patientIDs[i].ehrID = ehrId;
	                }
	            },
	            error: function(err) {
	            	console.log(JSON.parse(err.responseText).userMessage);
	            }
	        });
	    }
	});

}


function dodajVitalneZnake(ehrID,data) {

	sessionId = getSessionId();
	//arhetipi:  (za zdruzevanje arhetipov naredimo template, predlogo --> mi naredimo predlogo vitalni znaki)
	var bmi = (data.telesnaTeza/(data.telesnaVisina*data.telesnaVisina/10000));
	console.log(bmi);
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
		    "vital_signs/indirect_oximetry:0/spo2|numerator": data.nasicenostKrviSKisikom,
		    "vital_signs/body_mass_index/any_event/body_mass_index" : bmi
		};
		var parametriZahteve = {
		    "ehrId": ehrID,
		    templateId: 'Vital Signs',
		    format: 'FLAT',
		};
		$.ajax({
		    url: baseUrl + "/composition?" + $.param(parametriZahteve),
		    type: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(podatki),
		    success: function (res) {
		    	console.log(res.meta.href);
		    },
		    error: function(err) {
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		});
	
	
}
//-------------------------------------------------------------------------------


function narisiGraf(data){
	$("#main").append("</div><span class='label label-info'>Graf</span></div><div class='row' id='graf'><div>");
	$("#graf").html("");
	$("#graf").html( new graph(data)); //new graph()  

}


var graph = function(data){
    var margin = {top: 30, right: 80, bottom: 30, left: 50},
	   width = parseInt(d3.select('#graf').style('width'), 10) - margin.left - margin.right,
	  	//height = 500 - margin.top - margin.bottom;
	  	height = width * 2 / 3;

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
	
	function n(error, data) {
		color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));
		 data.forEach(function(d) {
		 d.date = parseDate(d.date);
			 
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
	      .style("text-anchor", "end");
	      
	
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


$(window).resize(function () {
	if(izbranoOkno === "visina" || izbranoOkno === "teza" || izbranoOkno === "tlak"){ //ce se nahaja na zavihku kjer je graf, klicemo funkcijo, ki bo pocakala .5 sekunde in sele potem znova nalozila graf ->drugace 
	//se vse skupaj nalozi veckrat,saj je funkcija navadno ob resizanju klicana veckrat
	    waitForFinalEvent(function(){
	      $("#main").empty();
	      refresh();
	    }, 500, "some unique string");
	}

});


var waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout (timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();

function refresh(){
	if(izbranoOkno === "visina"){
		$("#graf").remove();
		visina();
	}
	else if(izbranoOkno === "tlak"){
		$("#graf").remove();
		krvniTlak();
	}
	else if(izbranoOkno ==="teza"){
		$("#graf").remove();
		teza();
	}
}



//-----------------------------pacienti-------------------------------------------


//------------------zacasni podatki:---------------------------------------------
//ehrji--- na zacetku  pridobimo imena-nafilamo dropdown, na podlagi imen lahko potem iz dropdowna dostopamo do ehrjev
var patientIDs = [
	{"firstName":"","lastName":"","birthDate":"","ehrID":"3dd64865-5f48-4ad9-8378-d308b25ab090"},
	{"firstName":"","lastName":"","birthDate":"","ehrID":"fe1834a1-0a3a-42a6-8f93-e4992c1379a5"},
	{"firstName":"","lastName":"","birthDate":"","ehrID":"723d0804-4c3d-489f-bf14-e7c29ac1fd44"},
];

//---------------------------trajni podatki:--------------
var pacienti = [
	{"firstName":"Shaq", "lastName":"ONeal","datumRojstva":"1979-11-30T10:58"},//,"ehrID":"cdbd134f-5d34-425e-ac79-3b888b6c9422"},
	{"firstName":"Gran", "lastName":"Cereale","datumRojstva":"1965-1-3T01:16"},//"ehrID":"5a08689b-cee6-431c-b329-a8c483ed8999"},
	{"firstName":"Lara","lastName":"Croft","datumRojstva":"1987-6-20T16:00"},//"ehrID":"5a08689b-cee6-431c-b329-a8c483ed8999"},
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
	{"datumInUra":"2005-11-30T10:30","telesnaVisina":"189","telesnaTeza":"93","telesnaTemperatura":"36.4","sistolicniKrvniTlak":"144","diastolicniKrvniTlak":"85","nasicenostKrviSKisikom":"94"},
	{"datumInUra":"2006-11-30T10:30","telesnaVisina":"189","telesnaTeza":"99","telesnaTemperatura":"36.2","sistolicniKrvniTlak":"151","diastolicniKrvniTlak":"88","nasicenostKrviSKisikom":"94"},
	{"datumInUra":"2007-11-30T10:30","telesnaVisina":"189","telesnaTeza":"110","telesnaTemperatura":"36.1","sistolicniKrvniTlak":"154","diastolicniKrvniTlak":"93","nasicenostKrviSKisikom":"94"},
	
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
	{"ehrId":"", "datumInUra":"2007-11-30T10:30","telesnaVisina":"181","telesnaTeza":"90","telesnaTemperatura":"36","sistolicniKrvniTlak":"132","diastolicniKrvniTlak":"88","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2008-11-30T10:30","telesnaVisina":"181","telesnaTeza":"88","telesnaTemperatura":"36","sistolicniKrvniTlak":"130","diastolicniKrvniTlak":"90","nasicenostKrviSKisikom":"97"},
];

var tretji = [
	{"ehrId":"", "datumInUra":"2000-11-30T10:30","telesnaVisina":"150","telesnaTeza":"40","telesnaTemperatura":"36","sistolicniKrvniTlak":"110","diastolicniKrvniTlak":"70","nasicenostKrviSKisikom":"95"},
	{"ehrId":"", "datumInUra":"2001-06-30T10:30","telesnaVisina":"155","telesnaTeza":"45","telesnaTemperatura":"37.8","sistolicniKrvniTlak":"111","diastolicniKrvniTlak":"74","nasicenostKrviSKisikom":"95"},
	{"ehrId":"", "datumInUra":"2001-09-30T10:30","telesnaVisina":"156","telesnaTeza":"46","telesnaTemperatura":"38","sistolicniKrvniTlak":"115","diastolicniKrvniTlak":"73","nasicenostKrviSKisikom":"95"},
	{"ehrId":"", "datumInUra":"2001-11-30T10:30","telesnaVisina":"157","telesnaTeza":"49","telesnaTemperatura":"38.4","sistolicniKrvniTlak":"110","diastolicniKrvniTlak":"77","nasicenostKrviSKisikom":"93"},
	{"ehrId":"", "datumInUra":"2002-01-30T10:30","telesnaVisina":"163","telesnaTeza":"55","telesnaTemperatura":"36","sistolicniKrvniTlak":"118","diastolicniKrvniTlak":"75","nasicenostKrviSKisikom":"89"},
	{"ehrId":"", "datumInUra":"2003-11-30T10:30","telesnaVisina":"168","telesnaTeza":"60","telesnaTemperatura":"37","sistolicniKrvniTlak":"121","diastolicniKrvniTlak":"80","nasicenostKrviSKisikom":"91"},
	{"ehrId":"", "datumInUra":"2004-11-30T10:30","telesnaVisina":"174","telesnaTeza":"70","telesnaTemperatura":"38","sistolicniKrvniTlak":"123","diastolicniKrvniTlak":"81","nasicenostKrviSKisikom":"92"},
	{"ehrId":"", "datumInUra":"2005-11-30T10:30","telesnaVisina":"176","telesnaTeza":"79","telesnaTemperatura":"35.9","sistolicniKrvniTlak":"126","diastolicniKrvniTlak":"82","nasicenostKrviSKisikom":"96"},
	{"ehrId":"", "datumInUra":"2007-11-30T10:30","telesnaVisina":"176","telesnaTeza":"73","telesnaTemperatura":"35.8","sistolicniKrvniTlak":"128","diastolicniKrvniTlak":"85","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2009-11-30T10:30","telesnaVisina":"176","telesnaTeza":"64","telesnaTemperatura":"36","sistolicniKrvniTlak":"125","diastolicniKrvniTlak":"80","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2010-11-30T10:30","telesnaVisina":"176","telesnaTeza":"60","telesnaTemperatura":"36","sistolicniKrvniTlak":"119","diastolicniKrvniTlak":"78","nasicenostKrviSKisikom":"97"},
	{"ehrId":"", "datumInUra":"2013-11-30T10:30","telesnaVisina":"176","telesnaTeza":"51","telesnaTemperatura":"36","sistolicniKrvniTlak":"110","diastolicniKrvniTlak":"74","nasicenostKrviSKisikom":"97"},

];