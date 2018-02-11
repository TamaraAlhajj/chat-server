/*
	Tamara Alhajj
	100948027
	COMP2406
	Assignment 3
*/
$(document).ready(function(){
			
	var userName = prompt("What's your name?")||"Anon";

	var socket = io(); //connect to the server that sent this page
	socket.on('connect', function(){
		socket.emit("intro", userName);
	});
	
	var blockedList = [];

	$('#inputText').keypress(function(ev){
			if(ev.which===13){
				//send message
				socket.emit("message",$(this).val());
				ev.preventDefault(); //if any
				$("#chatLog").append((new Date()).toLocaleTimeString()+", "+userName+": "+$(this).val()+"\n")
				$(this).val(""); //empty the input
			}
	});

	socket.on("message",function(data){
		$("#chatLog").append(data+"\n");
		$('#chatLog')[0].scrollTop=$('#chatLog')[0].scrollHeight; //scroll to the bottom
	});

	socket.on("privateMessage",function(data){
		//display private msg sent
		var privateMSG = alert("Private message from "+data.sender+": "+data.message);
		////give option to send one back
		var msg = prompt("What's your private message to "+data.sender+"?");
		var msgOBJ = {
			name: data.sender,
			message: msg
		}
		//if msg was typed then send it back
		if(msg){
			console.log(msgOBJ);
			socket.emit("privateMessage", msgOBJ);
		}
	});
	
	socket.on("userList", function(data){		
		$("#userList").empty();
		console.log(data);
		for (var i in data.users){
			//if not in array blockedList indexOf() returns -1
			var isBlocked = blockedList.indexOf(data.users[i]);
			if(isBlocked !== -1){
				//if blocked make CSS strike-through by adding class
				$("#userList").append("<li class='strike'>" + data.users[i] + "</li>");
			}else{
				$("#userList").append("<li>" + data.users[i] + "</li>");
			}
		}
		$("li").dblclick(function(event){
			if(event.shiftKey){
				//if not in array blockedList indexOf() returns -1
				var isBlocked = blockedList.indexOf($(this).text());
		
				if($(this).text() === userName) {
					alert("You can't block yourself!");
				}else{
					//handle blocked user in server
					socket.emit("blockUser", {name: $(this).text()});
					if(isBlocked !== -1){
						//already blocked so unblock and unstrike
						blockedList.splice(isBlocked, 1);
						$(this).removeClass('strike');
					}else{
						//if not already blocked, add them to blockedList and strike
						blockedList.push($(this).text());						
						$(this).addClass('strike');
					}
				}
            }else{
				if($(this).text() === userName) {
					alert("You can't send a private message to yourself!");
				}else{
					var msg = prompt("What is your message for user "+$(this).text()+"?");
					//if they type a msg then send it 
					if(msg){
						var msgOBJ = {
							name: $(this).text(),
							message: msg
						}
						socket.emit("privateMessage", msgOBJ);
					}
				}
			}
		});
	});
});