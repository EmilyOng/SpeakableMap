import os
from flask import Flask, request, render_template, redirect, url_for, session, make_response, send_from_directory
from werkzeug.utils import secure_filename
from data_processing import return_info


app = Flask(__name__)
app.config["SECRET_KEY"] = "r34kecw.gr,vm43ewcFRCcR"


@app.errorhandler(Exception)
def handle_error(e):
    return render_template("error.html")


@app.route("/")
def index():
  return render_template("index.html")


@app.route("/load", methods=["POST", "GET"])
def load():
  if "sketch" in request.files:
    sketch_file = request.files["sketch"]
    sketch_filename = secure_filename(sketch_file.filename)
    data_split = sketch_filename.split(".")
    file_name = "".join(data_split[:len(data_split) - 1])
    file_ext = "." + data_split[-1]
    counter = 1
    path_name = os.path.join("uploads", file_name + file_ext)
    sketch_filename = file_name
    while os.path.exists(path_name):
      sketch_filename = file_name + f"({str(counter)})"
      path_name = os.path.join("uploads", sketch_filename + file_ext)
      counter += 1
    sketch_file.save(path_name)
    session.clear()
    session["sketch_file"] = {"path": path_name, "file_name": sketch_filename}
    session["file_id"] = sketch_filename
    return render_template("loading.html")
  return redirect(url_for("index"))


@app.route("/about")
def about():
  return render_template("about.html")


@app.route("/uploads/<file_name>")
def uploads(file_name):  
  return send_from_directory(os.path.join("uploads", "results", 
                              session["file_id"]), file_name)


@app.route("/mindmap", methods=["POST", "GET"])
def mindmap():
  if request.method == "GET":
    if session and "data" in session:
      return render_template("mindmap.html", hasData=True, data=session["data"])
    return redirect(url_for("index"))
  else:
    if session:
      if "sketch_file" in session:
        nodes, errors, detected_text = return_info(session["sketch_file"]["path"], 
                                                  session["sketch_file"]["file_name"])
        elements = {"topics": [], "ideas": [], "arrows": []}
        categories = {"1": "topics", "2": "ideas", "3": "arrows"}
        node_dict = []
        for i in range (len(nodes)):
          # area, class_, text
          node = nodes[i]
          category = str(node[1])
          elements[categories[category]].append({
            "info": node[2],
            "name": categories[category] + "-" + str(len(elements[categories[category]]) + 1)
          })
          node_dict.append(elements[categories[category]][-1]["name"])
          nodes[i] = [nodes[i][1], nodes[i][2]]
        
        connections = []
        graph = {}
        threshold = 600
        for i in errors:
          curr_node = node_dict[int(i)]
          graph[curr_node] = []
          for error in errors[i]:
            if error[0] <= threshold:
              node_name = node_dict[error[1]]
              if not ((node_name in graph and curr_node in graph[node_name]) or
                      curr_node in graph and node_name in curr_node):
                graph[curr_node].append(node_name)
        for conn in graph:
           if len(graph[conn]) >= 2:
            connections.append({
              "from": graph[conn][0],
              "to": graph[conn][1],
              "connector": 0
            })
        session["data"] = {
          "connections": connections,
          "elements": {"topics": elements["topics"], "ideas": elements["ideas"], "arrows": []},
          "detected_text": detected_text
        }
        return make_response("success", 200)
  return redirect(url_for("index"))

if __name__ == "__main__":
  app.run(debug=True)