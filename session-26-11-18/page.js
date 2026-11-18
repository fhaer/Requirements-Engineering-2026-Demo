document.addEventListener("DOMContentLoaded", function(event) { 
	initialize(); 
}); 
function initialize () { 
	var button1 = document.getElementById("Button1"); 
	button1.addEventListener("click", 
		function(event){ 
			var eingabe = document.forms["Form1"]["Text1"].value; 
			var selektion = document.forms["Form1"]["List1"].value; 	
			alert (eingabe + " " + selektion); 
			event.preventDefault(); 
		}); 
}
