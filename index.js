var FB = require('fb');
var options = FB.options({'appId':'340838593082918',version:'v2.12'});
var fb = new FB.Facebook(options);
var fs = require('fs');

function main() {
	var data = [];
	fb.setAccessToken('EAACEdEose0cBAHxPS4GNEoaICGXfHJIDTlT3GtuLgbhMoelA5hcPAZBBu8QMQUdlptgPMMvTiuLGMsCzzSC6Vu0E3XDZBKd7ObBt27XJ1BFgNnUGoaj4WaYpPVbV4Hv2NQikK0UNrwBCGohapqsLUBPZCiZA8V59uQXrgDM0sbTLwezlatQ08uRaTVQUSgLdd25cKePdnQZDZD');
	console.log(fb.getAccessToken());
	fb.api('560069054327444/conversations',function(res){
		data = res.data;
		data.forEach(function(element){
			fb.api(element.id,{fields:'messages'},function(res){
				res.messages.data.forEach(function(element){
					fb.api(element.id,{fields:'message,from,sticker'},function(res){
						var message = res.from.name + ": " + res.message + "sticker: " + res.sticker;
						fs.appendFile('./text.txt',message+'\n',function(err){
							if(err) {
        						return console.log(err);
    						}
						})
					});
				});
			})
		});
	});
};

main();
