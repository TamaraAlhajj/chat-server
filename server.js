/*
	SocketIO based chat room. 
	
	Tamara Alhajj
	100948027
	COMP2406
	Assignment 3
*/

var http = require('http').createServer(handler);
var io = require('socket.io')(http);
var fs = require('fs');
var url = require('url');
var mime = require('mime-types');


http.listen(2406);

console.log("Chat server listening on port 2406");

var clients = [];
const ROOT = "./public_html";

function handler(req,res){
	//parse the url
	var urlObj = url.parse(req.url,true);
	var filename = ROOT+urlObj.pathname;
	// static server
	//the callback sequence for static serving...
	fs.stat(filename,function(err, stats){
		if(err){   //try and open the file and handle the error, handle the error
			respondErr(err);
		}else{
			if(stats.isDirectory())	filename+="/index.html";
	
			fs.readFile(filename,function(err, data){
				if(err)respondErr(err);
				else respond(200,data);
			});
		}
	});
	
	//locally defined helper function
	//responds in error, and outputs to the console
	function respondErr(err){
		console.log("Handling error: ",err);
		if(err.code==="ENOENT"){
			serve404();
		}else{
			respond(500,err.message);
		}
	}

	//locally defined helper function
	//sends off the response message
	function respond(code, data){
		// content header
		res.writeHead(code, {'content-type': mime.lookup(filename)|| 'text/html'});
		// write message and signal communication is complete
		res.end(data);
	}	
	
	//locally defined helper function
	//serves 404 files 
	function serve404(){
		fs.readFile(ROOT+"/404.html","utf8",function(err,data){ //async
			if(err)respond(500,err.message);
			else respond(404,data);
		});
	}
}

io.on("connection", function(socket){
	console.log("Got a connection");
	
	socket.on("intro",function(data){
		//add user name to each new socket
		socket.username = data;
		//add blocked userlist to each new socket
        socket.blockedList = [];
		
		clients.push(socket);
		io.emit("userList", {'users' : getUserList()});
		socket.broadcast.emit("message", timestamp()+": "+socket.username+" has entered the chatroom.");
		socket.emit("message","Welcome, "+socket.username+".");
	});
		
	socket.on("message", function(data){
		console.log("got message: "+data);
				
		//BONUS
		var friends = [];
		
		//go through list of users and find who blocked this user
		for(var i=0; i<clients.length; i++){
			//if not in array blockedList, indexOf() returns -1
			//check if receiver has blocked you
			var isBlocked = (clients[i]).blockedList.indexOf(socket.username);
			if((isBlocked === -1) && (clients[i])!==socket) friends.push(clients[i]);
		}
		//send message to ONLY users who haven't blocked you
		for(var i=0; i<friends.length; i++){
			friends[i].emit("message",timestamp()+", "+socket.username+": "+data);
		}
		//empty
		friends = [];
	});

	socket.on("disconnect", function(){
		console.log(socket.username+" disconnected");
		clients = clients.filter(function(ele){  
			return ele!==socket;
		});
		//Note: keep blocked after disconnection
		io.emit("userList", {'users' : getUserList()});
		io.emit("message", timestamp()+": "+socket.username+" disconnected.");
	});
	
	socket.on("privateMessage", function(data){		
		var dataOut = {
			sender:socket.username,
			message:data.message
		};
		for(var i=0; i<clients.length; i++){
			//if not in array blockedList, indexOf() returns -1
			//check if receiver has blocked you
			var isBlocked = (clients[i]).blockedList.indexOf(socket.username);
			//send to chosen user if that user has not blocked you
			if(clients[i].username === data.name && isBlocked === -1){
				console.log(clients[i].username);
				clients[i].emit("privateMessage", dataOut);
				console.log(data.name+" got private message: "+data.message);
			}else{
				console.log("User is blocked message not sent.");
			}
		}
	});
	
	socket.on("blockUser", function (data) {
		//if not in array blockedList indexOf() returns -1
		var isBlocked = socket.blockedList.indexOf(data.name);
		//Note: you can send a message to a user you have blocked
		//BUT they can not send messages to you, until you unblock them
		//they DO NOT know you have blocked them... sneaky ;) 
		console.log("Current blocked list of "+socket.username+": "+socket.blockedList);
		if(isBlocked !== -1){
			//if blocked, remove them from blockedList
			socket.blockedList.splice(isBlocked, 1);
			console.log("Updated blocked list of "+socket.username+": "+socket.blockedList);
			socket.emit("message", "Unblocked user: " + data.name);
		}else{
			//if not already blocked, add them to blockedList
			socket.blockedList.push(data.name);
			console.log("Updated blocked list of "+socket.username+": "+socket.blockedList);
			socket.emit("message", "Blocked user: " + data.name);
		}
	});
	
});

function getUserList(){
    var ret = [];
    for(var i=0;i<clients.length;i++){
        ret.push(clients[i].username);
    }
    return ret;
}

function timestamp(){
	return new Date().toLocaleTimeString();
}