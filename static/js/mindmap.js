var canvas = new fabric.Canvas("mindmap");

var fromStorage = window.localStorage.getItem("mindmap");
var nodes, connections, elements, sizing;
var defaultText = "Enter text here...";

bulmaToast.setDefaults({
  duration: 1000,
  position: "top-right",
  closeOnClick: true
})

if (fromStorage) {
  nodes = JSON.parse(window.localStorage.getItem("nodes"));
  connections = JSON.parse(window.localStorage.getItem("connections"));
  elements = JSON.parse(window.localStorage.getItem("elements"));
  sizing = JSON.parse(window.localStorage.getItem("sizing"));
}
else {
  nodes = data.elements;
  connections = data.connections;
  elements = {};
  sizing = {};
}

var isConnecting = false, pointA = null, targetA = null;
var hasUngrouped = false, ungroupTarget = null;

canvas.selection = false; // disable multi selection

// http://fabricjs.com/custom-control-render
var deleteIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
var img = document.createElement("img");
img.src = deleteIcon;


fabric.Object.prototype.controls.deleteControl = new fabric.Control({
  x: 0.5,
  y: -0.5,
  offsetY: 16,
  cursorStyle: "pointer",
  mouseUpHandler: deleteObject,
  render: renderIcon,
  cornerSize: 24
});


function makeArrow(coords, name) {
  var arrow = new fabric.Line(coords, {
                fill: "red",
                stroke: "red",
                strokeWidth: 5,
                selectable: false,
                evented: false,
                name: name
              });
  nodes["arrows"].push({
    "info": "",
    "name": name
  });
  return arrow;
}

function sortErrors(a, b) {
  if (a[1] == b[1]) { return 0; }
  else {
    return (a[1] < b[1]) ? -1: 1;
  }
}

function makeConnection(sourceElem, targetElem, arrowName) {
  var centerSource = {
    "x": parseFloat(sourceElem.ml.x + 
        (sourceElem.mr.x - sourceElem.ml.x) / 2),
    "y": parseFloat(sourceElem.ml.y + 
        (sourceElem.mr.y - sourceElem.ml.y) / 2),
  };
  var centerTarget = {
    "x": parseFloat(targetElem.ml.x + 
        (targetElem.mr.x - sourceElem.ml.x) / 2),
    "y": parseFloat(targetElem.ml.y + 
        (targetElem.mr.y - sourceElem.ml.y) / 2),
  }
  const gradient = Math.abs((centerTarget.y - centerSource.y) / 
                        (centerTarget.x - centerSource.x + 0.1));
  function calculate (relationship) {
    const source = relationship.substring(0, 2);
    const target = relationship.substring(2, 4);
    return parseFloat(Math.abs(targetElem[target].y - sourceElem[source].y) / 
                      Math.abs(targetElem[target].x - sourceElem[source].x + 0.1));
  }

  // astc
  var errors;
  if (centerTarget.y >= centerSource.y) {
    if (centerTarget.x >= centerSource.x) {
      // mb->mt, mb->ml, mr->ml, mr->mt (C)
      errors = [["mbmt", Math.abs(calculate("mbmt") - gradient)],
                ["mbml", Math.abs(calculate("mbml") - gradient)],
                ["mrml", Math.abs(calculate("mrml") - gradient)],
                ["mrmt", Math.abs(calculate("mrmt") - gradient)],
              ];
    }
    else {
      // mb->mt, mb->mr, ml->mt, ml->mr (T)
      errors = [["mbmt", Math.abs(calculate("mbmt") - gradient)],
                ["mbmr", Math.abs(calculate("mbmr") - gradient)],
                ["mlmt", Math.abs(calculate("mlmt") - gradient)],
                ["mlmr", Math.abs(calculate("mlmr") - gradient)],
              ];
    }
  }
  else {
    if (centerTarget.x >= centerSource.x) {
      // mt->ml, mt->mb, mr->ml, mr->mb (A)
      errors = [["mtml", Math.abs(calculate("mtml") - gradient)],
                ["mtmb", Math.abs(calculate("mtmb") - gradient)],
                ["mrml", Math.abs(calculate("mrml") - gradient)],
                ["mrmb", Math.abs(calculate("mrmb") - gradient)],
              ];
    }
    else {
      // mt->mr, mt->mb, ml->mr, ml->mb (S)
      errors = [["mtmr", Math.abs(calculate("mtmr") - gradient)],
                ["mtmb", Math.abs(calculate("mtmb") - gradient)],
                ["mlmr", Math.abs(calculate("mtmb") - gradient)],
                ["mlmb", Math.abs(calculate("mtmb") - gradient)],
              ];
    }
  }

  errors.sort(sortErrors);
  var sourceCoords = errors[0][0].substring(0, 2);
  var targetCoords = errors[0][0].substring(2, 4);
  var arrow = makeArrow([sourceElem[sourceCoords].x,
                        sourceElem[sourceCoords].y,
                        targetElem[targetCoords].x, 
                        targetElem[targetCoords].y], arrowName);
  return arrow;
}


function ungroup (group) {
  // https://stackoverflow.com/questions/24449481/fabric-js-grouped-itext-not-editable
  var items = group._objects;
  hasUngrouped = true;
  ungroupTarget = group;
  group._restoreObjectsState();
  canvas.remove(group);
  canvas.renderAll();
  for (var i = 0; i < items.length; i ++) {
    canvas.add(items[i]);
    canvas.renderAll();
  }
}


function renderIcon(ctx, left, top, styleOverride, fabricObject) {
  var size = this.cornerSize;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
  ctx.drawImage(img, -size/2, -size/2, size, size);
  ctx.restore();
}


function deleteObject(eventData, target) {
  var canvas = target.canvas;
  if (target.name.includes("topics") || target.name.includes("ideas")) {
    var targetType = target.name.includes("topics") ? "topics" : "ideas";
    for (var i = 0; i < nodes[targetType].length; i ++) {
      if (nodes[targetType][i]["name"] == target.name) {
        nodes[targetType].splice(i, 1);
        break;
      }
    }
    delete elements[target.name];
    var new_connections = [];
    for (var i = 0; i < connections.length; i ++) {
      if (connections[i]["from"] == target.name || connections[i]["to"] == target.name) {
        canvas.remove(connections[i]["connector"]);
      }
      else {
        new_connections.push(connections[i]);
      }
    }
    connections = new_connections;
    canvas.remove(target);
    canvas.requestRenderAll();
    bulmaToast.toast({ message: "Deleted!", type: "is-info" });
  }
}


function deleteArrow(target) {
  var hasArrow = false;
  for (var i = 0; i < nodes["arrows"].length; i ++) {
    if (nodes["arrows"][i]["name"] == target.name) {
      nodes["arrows"].splice(i, 1);
      hasArrow = true;
      break;
    }
  }
  var new_connections = [];
  for (var i = 0; i < connections.length; i ++) {
    if (connections[i]["connector"] == target) {
      canvas.remove(connections[i]["connector"]);
    }
    else {
      new_connections.push(connections[i]);
    }
  }
  connections = new_connections;
  canvas.requestRenderAll();
  if (hasArrow) {
    bulmaToast.toast({ message: "Deleted!", type: "is-info" });
  }
}

// state: 0 random, 1 fixed, 2 defined
function makeIdea(state=0, info=defaultText, name=`ideas-${nodes['ideas'].length + 1}`,
                  stroke="blue", fill="white") {
  var text = new fabric.IText(info, {
    fontSize: 30,
    originX: "center",
    originY: "center",
    name: "text"
  });
  var rect = new fabric.Rect({
    width: state == 2 ? sizing[name]["width"] : text.width + 20,
    height: state == 2 ? sizing[name]["height"] : text.height + 20,
    fill: fill,
    stroke: stroke,
    originX: "center",
    originY: "center",
    angle: state == 2 ? sizing[name]["angle"] : 0,
    scaleX: state == 2 ? sizing[name]["scaleX"] : 1,
    scaleY: state == 2 ? sizing[name]["scaleY"] : 1,
    name: name.replace("ideas", "rect")
  });
  var idea = new fabric.Group([rect, text], {
    left: state == 0 ? Math.floor(Math.random() * Math.floor(canvas.width * 0.8)) + 1 : 
          state == 1 ? canvas.width * 0.1 : sizing[name]["left"],
    top: state == 0 ? Math.floor(Math.random() * Math.floor(canvas.height * 0.8)) + 1 : 
         state == 1 ? canvas.height * 0.1 : sizing[name]["top"],
    name: name
  });
  elements[name] = idea.oCoords;
  sizing[name] = {
    "left": idea.left,
    "top": idea.top,
    "width": rect.width,
    "height": rect.height,
    "angle": rect.angle,
    "scaleX": rect.scaleX,
    "scaleY": rect.scaleY
  };
  return idea;
}


// state: 0 random, 1 fixed, 2 defined
function makeTopic(state=0, info=defaultText, name=`topics-${nodes['topics'].length + 1}`,
                  stroke="purple", fill="white") {
  var text = new fabric.IText(info, {
    fontSize: 30,
    originX: "center",
    originY: "center",
    name: "text"
  });
  var ellipse = new fabric.Ellipse({
    rx: state == 2 ? sizing[name]["rx"] : text.width + 20,
    ry: state == 2 ? sizing[name]["ry"] : text.height + 20,
    fill: fill,
    stroke: stroke,
    originX: "center",
    originY: "center",
    angle: state == 2 ? sizing[name]["angle"] : 0,
    scaleX: state == 2 ? sizing[name]["scaleX"] : 1,
    scaleY: state == 2 ? sizing[name]["scaleY"] : 1,
    name: name.replace("topics", "ellipse")
  });
  var topic = new fabric.Group([ellipse, text], {
    left: state == 0 ? Math.floor(Math.random() * Math.floor(canvas.width * 0.8)) + 1 : 
          state == 1 ? canvas.width * 0.1 : sizing[name]["left"],
    top: state == 0 ? Math.floor(Math.random() * Math.floor(canvas.height * 0.8)) + 1 : 
         state == 1 ? canvas.height * 0.1 : sizing[name]["top"],
    name: name
  });
  elements[name] = topic.oCoords;
  sizing[name] = {
    "left": topic.left,
    "top": topic.top,
    "rx": ellipse.rx,
    "ry": ellipse.ry,
    "angle": ellipse.angle,
    "scaleX": ellipse.scaleX,
    "scaleY": ellipse.scaleY
  };
  return topic;
}


function draw() {
  for (var node in nodes) {
    for (var i = 0; i < nodes[node].length; i ++) {
      if (node == "ideas") {
        if (nodes[node][i]["info"].length > 0) {
          canvas.add(makeIdea(fromStorage ? 2 : 0, nodes[node][i]["info"], nodes[node][i]["name"]));
        }
      }
      else if (node == "topics") {
        if (nodes[node][i]["info"].length > 0) {
          canvas.add(makeTopic(fromStorage ? 2 : 0, nodes[node][i]["info"], nodes[node][i]["name"]));
        }
      }
    }
  }
  
  for (var connection in connections) {
    var source = connections[connection]["from"];
    var target = connections[connection]["to"];
    var sourceElem = elements[source];
    var targetElem = elements[target];
    var arrowName = `${source}-${target}`;
    if (sourceElem && targetElem) {
      var arrow = makeConnection(sourceElem, targetElem, arrowName);
      if (arrow) { 
        connections[connection]["connector"] = arrow;
        canvas.add(arrow); 
      }
    }
  }
}

function updateHolder(holderElement, text) {
  if (holderElement) {
    if (holderElement.name.includes("rect")) {
      holderElement.set("width", text.width + 20);
      holderElement.set("height", text.height + 20);
    }
    else if (holderElement.name.includes("ellipse")) {
      holderElement.set("rx", text.width + 20);
      holderElement.set("ry", text.height + 20);
    }
    holderElement.setCoords();
  }
}


function updateConnections(e) {
  var target = e.target;
  if (target) {
    for (var connection in connections) {
      if (connections[connection]["from"] == target.name) { // moving source
        var sourceElem = target.oCoords;
        var targetElem = elements[connections[connection]["to"]];
        elements[target.name] = sourceElem;
        if (sourceElem && targetElem) {
          var arrowName = `${target.name}-${connections[connection]['to']}`;
          var arrow = makeConnection(sourceElem, targetElem, arrowName);
          if (arrow) { 
            canvas.remove(connections[connection]["connector"]);
            connections[connection]["connector"] = arrow;
            canvas.add(arrow); 
          }
        }
      }
      else if (connections[connection]["to"] == target.name) { // moving target
        var sourceElem = elements[connections[connection]["from"]];
        var targetElem = target.oCoords;
        elements[target.name] = targetElem;
        if (sourceElem && targetElem) {
          var arrowName = `${connections[connection]['to']}-${target.name}`;
          var arrow = makeConnection(sourceElem, targetElem, arrowName);
          if (arrow) { 
            canvas.remove(connections[connection]["connector"]);
            connections[connection]["connector"] = arrow;
            canvas.add(arrow); 
          }
        }
      }
    }
  }
}


function groupObjects() {
  ungroupTarget = null; hasUngrouped = null;
  if (selectedGroup) {
    var newGroup = new fabric.Group([selectedGroup._objects[0], selectedGroup._objects[1]], {
      left: selectedGroup.left,
      top: selectedGroup.top,
      name: selectedGroup.name,
    });
    var category = selectedGroup.name.includes("topics") ? "topics" : "ideas";
    for (var i = 0; i < nodes[category].length; i ++) {
      if (nodes[category][i]["name"] == selectedGroup.name) {
        nodes[category][i]["info"] = selectedGroup._objects[1].text;
      }
    }
    canvas.remove(selectedGroup[0]);
    canvas.remove(selectedGroup[1]);
    canvas.add(newGroup);
    
    selectedGroup = null;
    holderElement = null;
    return newGroup;
  }
}


function updateProperties(target) {
  if (target.name.includes("topics")) {
    sizing[target.name] = {
      "left": target.left,
      "top": target.top,
      "rx": target._objects[0].rx,
      "ry": target._objects[0].ry,
      "angle": target.angle,
      "scaleX": target.scaleX,
      "scaleY": target.scaleY
    };
    elements[target.name] = target.oCoords;
  }
  else if (target.name.includes("ideas")) {
    sizing[target.name] = {
      "left": target.left,
      "top": target.top,
      "width": target._objects[0].width,
      "height": target._objects[0].height,
      "angle": target.angle,
      "scaleX": target.scaleX,
      "scaleY": target.scaleY
    };
    elements[target.name] = target.oCoords;
  }
}


function getMousePos(e) {
  var canvas = document.getElementById("mindmap");
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}


canvas.on("object:moving", function(e) { updateProperties(e.target); updateConnections(e); });
canvas.on("object:scaling", function(e) { updateProperties(e.target); updateConnections(e); });
canvas.on("object:rotating", function(e) { updateProperties(e.target); updateConnections(e); });
canvas.on("object:modified", function(e) { updateProperties(e.target); });


var holderElement = null;
var selectedGroup = null;

canvas.on("mouse:dblclick", function(e) { 
  var target = e.target;
  if (!(hasUngrouped && ungroupTarget == target)) {
    if (target && target._objects && target._objects.length > 1) {
      ungroup(target);
      selectedGroup = target;
      holderElement = target._objects[0];
      canvas.setActiveObject(target._objects[1]);
    }
  }
});

canvas.on("text:changed", function(e) { 
  var target = e.target;
  updateHolder(holderElement, target);
});

canvas.on("selection:cleared", function(e) {
  var target = groupObjects();
  if (target) { updateProperties(target); updateHolder(holderElement, target); }
})

document.getElementById("ideaBtn").addEventListener("click", function() {
  var idea = makeIdea(1);
  nodes["ideas"].push({
    "name": idea.name,
    "info": defaultText
  });
  canvas.add(idea);
  canvas.setActiveObject(idea);
  bulmaToast.toast({ message: "Added!", type: "is-info" });
});

document.getElementById("topicBtn").addEventListener("click", function() {
  var topic = makeTopic(1);
  nodes["topics"].push({
    "name": topic.name,
    "info": defaultText
  });
  canvas.add(topic);
  canvas.setActiveObject(topic);
  bulmaToast.toast({ message: "Added!", type: "is-info" });
});

document.getElementById("arrowBtn").addEventListener("click", function() {
  isConnecting = !isConnecting;
  canvas.discardActiveObject().renderAll();
  if (isConnecting) {
    document.getElementById("arrowBtn").classList.add("is-primary");
  }
  else {
    pointA = null;
    targetA = null;
    document.getElementById("arrowBtn").classList.remove("is-primary");
  }
});

document.getElementById("saveBtn").addEventListener("click", function() {
  var target = groupObjects();
  if (target) { updateProperties(target); updateHolder(holderElement, target); }

  window.localStorage.setItem("nodes", JSON.stringify(nodes));
  window.localStorage.setItem("connections", JSON.stringify(connections));
  window.localStorage.setItem("elements", JSON.stringify(elements));
  window.localStorage.setItem("sizing", JSON.stringify(sizing));
  window.localStorage.setItem("mindmap", "true");
  bulmaToast.toast({ message: "Saved!", type: "is-info" });
  canvas.discardActiveObject().renderAll();
});


canvas.on("mouse:over", function(e) {
  var target = e.target;
  if (target && e.e.shiftKey && selectedGroup == null) {
    var targetName = target.name;
    var targetText = target._objects[1].text;
    var msg = new SpeechSynthesisUtterance();
    msg.rate = 0.8;
    msg.text = targetText;
    window.speechSynthesis.speak(msg);
    var connectingNodes = new Set();
    for (var i = 0; i < connections.length; i ++) {
      if (connections[i]["to"] == targetName) {
        connectingNodes.add(connections[i]["from"])
      }
      else if (connections[i]["from"] == targetName) {
        connectingNodes.add(connections[i]["to"])
      }
    }
    connectingNodes.forEach(function (nodeName) {
      var nodeType = nodeName.includes("ideas") ? "ideas" : "topics";
      for (var j = 0; j < nodes[nodeType].length; j ++) {
        if (nodes[nodeType][j].name == nodeName) {
          if (nodes[nodeType][j].info.length > 0) {
            var msg = new SpeechSynthesisUtterance();
            msg.rate = 0.8;
            msg.text = `${targetText} is related to ${nodes[nodeType][j].info}`;
            window.speechSynthesis.speak(msg);
          }
        }
      }
    })
  }
});


canvas.on("mouse:down", function(e) {
  if (isConnecting) {
    var mousePos = getMousePos(e.e);
    var x = mousePos.x, y = mousePos.y;
    if (e.target && (e.target.name.includes("topics") || e.target.name.includes("ideas"))) {
      if (pointA) {
        var source = targetA.name, target = e.target.name;
        var isConnected = false;
        var arrowName = `${source}-${target}`;
        for (var i = 0; i < connections.length; i ++) {
          if ((connections[i]["from"] == source && connections[i]["to"] == target) ||
              (connections[i]["from"] == target && connections[i]["to"] == source)) {
              isConnected = true;
          }
        }
        if (!isConnected && source != target) {
          var arrow = makeConnection(targetA.oCoords, e.target.oCoords, arrowName);
          canvas.add(arrow);
          connections.push({
            "from": source,
            "to": target,
            "connector": arrow
          });
          bulmaToast.toast({ message: "Connected!", type: "is-info" });
        }
        
        pointA = null;
        targetA = null;
      }
      else {
        pointA = new fabric.Point(x, y);
        targetA = e.target;
      }
    }
  }
  if (e.e.shiftKey) {
    var mousePos = getMousePos(e.e);
    var target = null, error = 0;
    for (var i = 0; i < connections.length; i ++) {
      if (connections[i]["connector"]) {
        var x1 = parseFloat(connections[i]["connector"].x1),
            y1 = parseFloat(connections[i]["connector"].y1),
            x2 = parseFloat(connections[i]["connector"].x2),
            y2 = parseFloat(connections[i]["connector"].y2);
        // Y = mX + c
        var m = (y2 - y1) / (x2 - x1);
        var c = (y2 - m * x2);
        var target_x = mousePos.x, target_y = mousePos.y;
        var calculated_y = target_x * m + c, calculated_error = Math.abs(calculated_y - target_y);
        if (target) {
          if (calculated_error < error) {
            target = connections[i]["connector"];
            error = calculated_error;
          }
        }
        else {
          target = connections[i]["connector"];
          error = calculated_error;
        }
      }
    }
    if (error < 30 && target) { deleteArrow(target); }
  }
});

window.addEventListener("keydown", function(e) {
  // if (e.key == "Backspace") { e.preventDefault(); }
});

draw();