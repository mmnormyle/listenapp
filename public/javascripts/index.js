$(document).ready(function(){

	$("#div_music").hide();
	$("#div_new_session").hide();
	$("#div_unfinished").hide();

	$(".genre_inner").hide();
	$(".genre_inner").fadeIn(1000);
	$(".genre_inner").click(genreClicked);
	$("#txt_name_join").hide();
	$("#txt_name_join").keypress(function(e) {

	});
	$("#txt_group_join").keypress(function(e) {
		if(e.which==13) {
			$("#txt_group_join").hide();
			$("#txt_name_join").fadeIn(500);	
			$("#txt_name_join").focus();
			$("#txt_name_join").select();
		}
	});
});

function genreClicked() {
	$("#div_genre").hide();
	$("#div_unfinished").fadeIn(1000);
}