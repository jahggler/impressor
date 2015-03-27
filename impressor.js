var ready=function(b){if(!ready.r){ready.r=[]}if(!ready.t){ready.t=null}ready.r.push(b);var c=function(){clearTimeout(ready.t);while(ready.r.length){ready.r.splice(0,1)[0]()}};var a=function(){if(document&&document.getElementsByTagName&&document.getElementById&&document.body){c()}else{ready.t=setTimeout(a,13)}};if(ready.t==null){a()}return ready};

CanvasRenderingContext2D.prototype.clear =
  CanvasRenderingContext2D.prototype.clear || function (preserveTransform) {
    if (preserveTransform) {
      this.save();
      this.setTransform(1, 0, 0, 1, 0, 0);
    }

    this.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (preserveTransform) {
      this.restore();
    }
};

ready(function() {
	var supportsColorInput = (function() {
		var inputElem = document.createElement('input'), bool, docElement = document.documentElement, smile = ':)';

		inputElem.setAttribute('type', 'color');
		bool = inputElem.type !== 'text';

		// We first check to see if the type we give it sticks..
		// If the type does, we feed it a textual value, which shouldn't be valid.
		// If the value doesn't stick, we know there's input sanitization which infers a custom UI
		if (bool) {

		    inputElem.value         = smile;
		    inputElem.style.cssText = 'position:absolute;visibility:hidden;';

		    // chuck into DOM and force reflow for Opera bug in 11.00
		    // github.com/Modernizr/Modernizr/issues#issue/159
		    docElement.appendChild(inputElem);
		    docElement.offsetWidth;
		    bool = inputElem.value != smile;
		    docElement.removeChild(inputElem);
		}

		return bool;
	})();

	var removeClass = function(el, cl) {
		var cl_now = el.getAttribute('class');
		if (cl_now === null)
			return el;
		cl_now = cl_now.split(' ');
		for (var i = 0, end = cl_now.length; i < end; i++) {
			if (cl_now[i] === cl) {
				cl_now.splice(i, 1);
				break;
			}
		}
		el.setAttribute('class', cl_now.join(' '));
		return el;
	}
	var createElement = function(type) {
		return document.createElement(type);
	}
	var getElement = function(selector, context) {
		return document.querySelector(selector, context || document);
	}
	var getElements = function(selector) {
		return document.querySelectorAll(selector);
	}

	var selectTool = function(id) {
		getElement('#tool_'+id).click();
	};

	var updateLayerList = function(layers, ar) {
		layers.innerHTML = '';
		for (var a = ar.length-1; a >= 0; a--) {
			if (ar[a].type != 'system') {
				var l = createElement('li');
				l.innerHTML = '<a id="layer_'+(a)+'">'+ar[a]['name']+'</a>';
				(function(l, a) {
					l.querySelector('a').addEventListener('click', function() {
						chooseLayer(a);
					}, false);
				})(l, a);
				layers.appendChild(l);
			}
		}
	};

	var createLayer = function(layer_name) {
		var c = createElement('canvas');
		c.width = documents[documentId].width;
		c.height = documents[documentId].height;
		c.setAttribute('id', 'canvas_'+documents[documentId].layers.length);
		var layer = {
			'type': 'layer',
			'name': layer_name,
			'layer': c,
			'context': c.getContext('2d'),
			'pixels': c.getContext('2d').getImageData(0, 0, c.width, c.height)
		};
		documents[documentId].layers.push(layer);
		updateLayerList(layers_container, documents[documentId].layers);
		renderDocumentLayers();
	};

	var chooseTopLayer = function() {
		var top = documents[documentId].layers.length-1;
		chooseLayer(top);
	};

	var chooseLayer = function(i) {
		for (var a = 0, elements = getElements('#layers ul a'); a < elements.length; a++) {
			removeClass(elements[a], 'active');
		}
		activeLayer = i;
		var layer = getElement('#layer_'+i);
		layer.setAttribute('class', layer.getAttribute('class')+' active');
	};

	var setPixelData = function(context, pixels, x, y, color) {
		// color is a [RR,GG,BB,AA]
		//pixels.data;
		var offset = y * pixels.width * 4 + x * 4;
		pixels.data[offset] = color[0];
		pixels.data[offset+1] = color[1];
		pixels.data[offset+2] = color[2];
		pixels.data[offset+3] = color[3];
		context.putImageData(pixels, 0, 0, x, y, 1, 1);
	};

	var erasePixelData = function(context, pixels, x, y, subtract) {
		// subtract is a [RR,GG,BB,AA]
		//pixels.data;
		var offset = y * pixels.width * 4 + x * 4;
		pixels.data[offset] = pixels.data[offset];
		pixels.data[offset+1] = pixels.data[offset+1];
		pixels.data[offset+2] = pixels.data[offset+2];
		pixels.data[offset+3] = Math.max(pixels.data[offset+3] - subtract, 0);
		context.putImageData(pixels, 0, 0, x, y, 1, 1);
	};

	var copyPixels = function(layer, x1, y1, x2, y2) {
		return layer.context.getImageData(x1, y1, x2-x1, y2-y1);
	};

	var pastePixels = function(layer, pixels, x1, y1) {
		layer.context.putImageData(pixels, x1, y1, 0, 0, pixels.width, pixels.height);
		layer.pixels = layer.context.getImageData(0, 0, layer.layer.width, layer.layer.height);
	};

	var updateWindowList = function() {
		var ul = getElement('#menu_windows');
		ul.innerHTML = '';
		for (var a = 0; a < documents.length; a++) {
			var li = createElement('li');
			li.setAttribute('id', 'window_document_'+a);
			li.innerHTML = '<a>'+documents[a]['name']+'</a>';
			(function(li,a) {
				li.querySelector('a').addEventListener('click', function() { changeDocument(a) }, false);
			})(li, a);
			ul.appendChild(li);
		}
	};

	var createDocument = function(name, width, height) {
		var document = {
			'name': name,
			'width': width,
			'height': height,
			'background_color': '',
			'background_opacity': 1,
			'layers': [{
				'type': 'layer',
				'name': 'Layer 1'
			}]
		};
		documents.push(document);
		updateWindowList();
	};

	var renderDocumentLayers = function() {
		while(sceneCont.hasChildNodes()) {
			sceneCont.removeChild(sceneCont.childNodes[0]);
		}

		for (var a = 0; a < documents[documentId].layers.length; a++) {
			if (!documents[documentId].layers[a].layer) {
				var c = createElement('canvas');
				c.width = documents[documentId].width;
				c.height = documents[documentId].height;
				c.setAttribute('id', 'canvas_'+a);
				documents[documentId].layers[a].layer = c;
				documents[documentId].layers[a].context = c.getContext('2d');
				documents[documentId].layers[a].pixels = documents[documentId].layers[a].context.getImageData(0, 0, c.width, c.height);
			}
			sceneCont.appendChild(documents[documentId].layers[a].layer);
		}
	};

	var changeDocument = function(i) {
		documentId = i;
		// mark active document
		Array.prototype.forEach.call(getElements('#menu_windows li'), function(el) {
			el.setAttribute('class', '');
		});
		getElement('#window_document_'+documentId).setAttribute('class', 'active');

		// set container sizes
		sceneWidth = documents[documentId].width;
		sceneHeight = documents[documentId].height;
		fitSceneToWindow();
		// set canvas layers
		renderDocumentLayers();
		updateLayerList(layers_container, documents[documentId].layers);
		chooseTopLayer();
	};

	var exportToCanvas = function(i, callback) {
		var layers = [];
		for (var a = 0; a < documents[i].layers.length; a++) {
			if (documents[i].layers[a].type == 'layer') {
				layers.push(documents[i].layers[a].layer);
			}
		}

		var canvas = document.createElement('canvas'),
		    context,
		    images = layers.map(function(canvas) {
	            var img = new Image();
	            img.onload = onLoad;
	            img.src = canvas.toDataURL();
	            return img;
	        }),
		    imgCounter = 0,
		    widths = [],
		    heights = [];

		function onLoad() {
			widths.push(this.width);
			heights.push(this.height);

			if (++imgCounter == images.length) {
				merge();
			};
		};
		function merge() {
			canvas.width = Math.max.apply(null, widths);
			canvas.height = Math.max.apply(null, heights);
			context = canvas.getContext('2d');

			images.forEach(function(img) {
				context.drawImage(img, 0, 0, img.width, img.height);
			});

			callback(canvas);

			delete context;
		};
	};

	var saveDocument = function(i) {
		exportToCanvas(i, function(canvas) {
			var a = createElement('a');
			a.setAttribute('href', canvas.toDataURL());
			a.setAttribute('download', documents[i]['name']+'.png');
			a.click();
			delete canvas;
		});
	};

	var previewInBackground = function(i) {
		exportToCanvas(i, function(canvas) {
			var w = window.screen.availWidth - 20;
			var h = window.screen.availHeight - 50;
			var ref = window.open('about:blank', 'impressor_preview', 'width='+w+',height='+h+',location=no,menubar=no,resizable=yes,scrollbars=no,status=yes');
			var html = '<html src="width: 100%; height: 100%; margin: 0">';
			html += '<head><title>Impressor.js Preview</title></head>';
			html += '<body style="width: 100%; height: 100%; margin: 0; background: url(&quot;'+canvas.toDataURL()+'&quot;)">';
			html += '<div style="text-align: center; position: fixed; bottom: 10px; left: 0; width: 100%">';
			html += '<input type="button" value="No Repeat" onclick="document.body.style.backgroundRepeat=\'no-repeat\'" />';
			html += '<input type="button" value="Horizontal Repeat" onclick="document.body.style.backgroundRepeat=\'repeat-x\'"  />';
			html += '<input type="button" value="Vertical Repeat" onclick="document.body.style.backgroundRepeat=\'repeat-y\'" />';
			html += '<input type="button" value="All Repeat"" onclick="document.body.style.backgroundRepeat=\'repeat\'" />';
			html += '</div>';
			html += '<div style="text-align: center; position: fixed; bottom: 50px; left: 0; width: 100%">';
			html += '<input type="button" value="5%" onclick="document.body.style.mozBackgroundSize=\'5% auto\';document.body.style.webkitBackgroundSize=\'5% auto\';document.body.style.backgroundSize=\'5% auto\'" />';
			html += '<input type="button" value="10%" onclick="document.body.style.mozBackgroundSize=\'10% auto\';document.body.style.webkitBackgroundSize=\'10% auto\';document.body.style.backgroundSize=\'10% auto\'" />';
			html += '<input type="button" value="15%" onclick="document.body.style.mozBackgroundSize=\'15% auto\';document.body.style.webkitBackgroundSize=\'15% auto\';document.body.style.backgroundSize=\'15% auto\'" />';
			html += '<input type="button" value="20%" onclick="document.body.style.mozBackgroundSize=\'20% auto\';document.body.style.webkitBackgroundSize=\'20% auto\';document.body.style.backgroundSize=\'20% auto\'" />';
			html += '<input type="button" value="25%" onclick="document.body.style.mozBackgroundSize=\'25% auto\';document.body.style.webkitBackgroundSize=\'25% auto\';document.body.style.backgroundSize=\'25% auto\'"  />';
			html += '<input type="button" value="50%" onclick="document.body.style.mozBackgroundSize=\'50% auto\';document.body.style.webkitBackgroundSize=\'50% auto\';document.body.style.backgroundSize=\'50% auto\'" />';
			html += '<input type="button" value="100%" onclick="document.body.style.mozBackgroundSize=\'100% auto\';document.body.style.webkitBackgroundSize=\'100% auto\';document.body.style.backgroundSize=\'100% auto\'" />';
			html += '<input type="button" value="auto" onclick="document.body.style.mozBackgroundSize=\'auto\';document.body.style.webkitBackgroundSize=\'auto\';document.body.style.backgroundSize=\'auto auto\'" />';
			html += '</div>';
			html += '</body></html>';

			ref.document.write(html);
			ref.focus();
			delete canvas;
		});
	};

	var resizeDocumentCanvas = function(i, width, height, direction) {
		var offsetLeft = 0;
		var offsetTop = 0;
		var fromLeft = 0;
		var fromTop = 0;
		if (direction === undefined || direction === 'lefttop') {
			offsetLeft = 0;
			offsetTop = 0;
		} else if (direction === 'righttop') {
			offsetLeft = width - documents[i].width;
			offsetTop = 0;
		} else if (direction === 'leftbottom') {
			offsetLeft = 0;
			offsetTop = height - documents[i].height;
		} else if (direction === 'rightbottom') {
			offsetLeft = width - documents[i].width;
			offsetTop = height - documents[i].height;
		}

		// set container sizes
		documents[i].width = sceneWidth = width;
		documents[i].height = sceneHeight = height;
		// set canvas layers
		// we need to move pixels to resize canvas :(
		for (var a = 0; a < documents[i].layers.length; a++) {
			var pixels = documents[i].layers[a].context.getImageData(0, 0, documents[i].layers[a].layer.width, documents[i].layers[a].layer.height);

			documents[i].layers[a].layer.width = documents[i].width;
			documents[i].layers[a].layer.height = documents[i].height;
			documents[i].layers[a].context.putImageData(pixels, offsetLeft, offsetTop);

			documents[i].layers[a].pixels = documents[i].layers[a].context.getImageData(0, 0, documents[i].width, documents[i].height);

		}


		fitSceneToWindow();
		renderDocumentLayers();
		console.log(documents[i]);
	};

	var collectDialogData = function(form) {
		var i, j, q = {};
		var elements = getElements('input,button,select,textarea', form);
		for (i = elements.length - 1; i >= 0; i = i - 1) {
			if (elements[i].name === "") {
				continue;
			}
			var nodeName = String(elements[i].nodeName).toUpperCase();
			switch (nodeName) {
			case 'INPUT':
				switch (elements[i].type) {
				case 'text':
				case 'hidden':
				case 'password':
				case 'button':
				case 'reset':
				case 'submit':
					q[elements[i].name] = elements[i].value;
					break;
				case 'checkbox':
				case 'radio':
					if (elements[i].checked) {
						q[elements[i].name] = elements[i].value;
					}
					break;
				case 'file':
					break;
				}
				break;
			case 'TEXTAREA':
				q[elements[i].name] = elements[i].value;
				break;
			case 'SELECT':
				switch (elements[i].type) {
				case 'select-one':
					q[elements[i].name] = elements[i].value;
					break;
				case 'select-multiple':
					var values = [];
					for (j = elements[i].options.length - 1; j >= 0; j = j - 1) {
						if (elements[i].options[j].selected) {
							values.push(elements[i].options[j].value);
						}
					}
					if (values.length) {
						q[elements[i].name] = values;
					}
					break;
				}
				break;
			case 'BUTTON':
				switch (elements[i].type) {
				case 'reset':
				case 'submit':
				case 'button':
					q[elements[i].name] = elements[i].value;
					break;
				}
				break;
			}
		}
		return q;
	}


	// just set up basic elements
	var impressorElem = getElement('#impressor');

	// menu
	var menu = createElement('div');
	menu.setAttribute('id', 'menu');
	var menuul = createElement('ul');
	menu.appendChild(menuul);
	impressorElem.appendChild(menu);

	// menu 1
	var menu1 = createElement('li');
	menu1.setAttribute('class', 'level1');
	menu1.innerHTML = '<a>File</a><ul><li><a id="menu_new_image">New</a></li><li><a id="menu_save">Save..</a></li></ul>';
	menuul.appendChild(menu1);

	// menu 2
	var menu2 = createElement('li');
	menu2.setAttribute('class', 'level1');
	menu2.innerHTML = '<a>Image</a><ul><li><a id="menu_image_canvas_size">Canvas Size</a></li></ul>';
	menuul.appendChild(menu2);

	// menu 3
	var menu3 = createElement('li');
	menu3.setAttribute('class', 'level1');
	menu3.innerHTML = '<a>Filter</a><ul><li><a id="menu_filter_grayscale">Grayscale</a></li></ul>';
	menuul.appendChild(menu3);

	// menu 5
	var menu5 = createElement('li');
	menu5.setAttribute('class', 'level1');
	menu5.innerHTML = '<a>Web</a><ul><li><a id="menu_preview_in_background">Preview in background..</a></li></ul>';
	menuul.appendChild(menu5);

	// menu 4
	var menu4 = createElement('li');
	menu4.setAttribute('class', 'level1');
	menu4.innerHTML = '<a>Window</a><ul><li><ul id="menu_windows"></ul></li><li class="menu_delim"></li><li><a>Close All</a></li></ul>';
	menuul.appendChild(menu4);

	var menuIsActive = false;
	// set menu events
	for (var a = 0, menulevels = getElements('#menu .level1 > a'); a < menulevels.length; a++) {
		menulevels[a].addEventListener('click', function(e) {
			e.stopPropagation();
			if ((new RegExp('\\bactive\\b')).test(this.getAttribute('class'))) {
				removeClass(this, 'active');
				menuIsActive = false;
			} else {
				for (var b = 0; b < menulevels.length; b++) {
					removeClass(menulevels[b], 'active');
				}
				this.setAttribute('class', this.getAttribute('class') + ' active');
				menuIsActive = true;
			}
		});
	}

	// menus
	var menu_new_image = getElement('#menu_new_image');
	var menu_save = getElement('#menu_save');
	var menu_preview_in_background = getElement('#menu_preview_in_background');
	var menu_image_canvas_size = getElement('#menu_image_canvas_size');
	var menu_filter_grayscale = getElement('#menu_filter_grayscale');

	menu_new_image.addEventListener('click', function() {
		createDocument('New '+(documents.length+1), 100, 100);
		changeDocument(documents.length-1);
	}, false);
	menu_save.addEventListener('click', function() {
		saveDocument(documentId);
	}, false);
	menu_preview_in_background.addEventListener('click', function() {
		previewInBackground(documentId);
	}, false);
	menu_image_canvas_size.addEventListener('click', function() {
		showDialog('canvas_size', {
			'content': 'Canvas Size: <input type="text" size="4" name="canvas_width" value="'+documents[documentId].width+'" /> x <input type="text" size="4" name="canvas_height" value="'+documents[documentId].height+'" /><br />Expand from:<br /><div style="width: 60px; height: 60px"><input type="radio" name="direction" value="lefttop" checked="checked" /><input type="radio" name="direction" value="righttop" /><br /><input type="radio" name="direction" value="leftbottom" /><input type="radio" name="direction" value="rightbottom" /></div>',
			'button_ok': function(r) { resizeDocumentCanvas(documentId, r.canvas_width, r.canvas_height, r.direction); },
			'button_cancel': 1 });
	}, false);

	menu_filter_grayscale.addEventListener('click', function() {
		var layer = documents[documentId].layers[activeLayer];
		var pixels = layer.pixels;
		var offset;
		var red,green,blue,alpha,avg;
		for (var a = 0; a < pixels.height; a++) {
			for (var b = 0; b < pixels.width; b++) {
				offset = a * pixels.width * 4 + b * 4;
				red = pixels.data[offset];
				green = pixels.data[offset+1];
				blue = pixels.data[offset+2];
				//alpha = pixels.data[offset+3];
				avg = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
				pixels.data[offset] = pixels.data[offset+1] = pixels.data[offset+2] = avg;
			}
		}
		layer.context.clear();
		layer.context.putImageData(pixels, 0, 0);
		layer.pixels = layer.context.getImageData(0, 0, pixels.width, pixels.height);
		documents[documentId].layers[activeLayer] = layer;
	}, false);

	// set other events
	var body = getElement('body');
	body.addEventListener('click', function() {
		if (menuIsActive) {
			for (var b = 0; b < menulevels.length; b++) {
				removeClass(menulevels[b], 'active');
			}
		}
	}, false);

	// left panel
	var panel_left = createElement('div');
	panel_left.setAttribute('id', 'panel_left');
	impressorElem.appendChild(panel_left);

	// tools
	var activeTool = null;
	var tools = createElement('div');
	tools.setAttribute('id', 'tools');
	tools.innerHTML = '<div class="panel-title">Tools</div><ul>\
	<li><a id="tool_select"><span>Select</span></a></li>\
	<li><a id="tool_move"><span>Move</span></a></li>\
	<li><a id="tool_pencil"><span>Pencil</span></a></li>\
	<li><a id="tool_erase"><span>Erase</span></a></li>\
	</ul>';
	panel_left.appendChild(tools);
	var clipboard = null;
	var mouseDown = function() { };
	var mouseUp = function() { };
	var mouseMove = function() { };
	var keyDown = function() { };
	var keyUp = function() { };
	var isRMB = function(e) {
		var isRightMB = false;
		e = e || window.event;

		if ("which" in e)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
		    isRightMB = e.which == 3;
		else if ("button" in e)  // IE, Opera
		    isRightMB = e.button == 2;
		return isRightMB;
	};

	var ctrlDown = false;
  var shiftDown = false;
  var shiftKey = 16, ctrlKey = 17, vKey = 86, cKey = 67, nKey = 78;
	document.addEventListener('keydown', function(e) {
		if (e.keyCode == ctrlKey) ctrlDown = true;
		else if (e.keyCode == shiftKey) shiftDown = true;
	});
	document.addEventListener('keyup', function(e) {
		if (e.keyCode == ctrlKey) ctrlDown = false;
		else if (e.keyCode == shiftKey) shiftDown = false;
	});

	for (var a = 0, toolicons = getElements('#tools a'); a < toolicons.length; a++) {
		toolicons[a].addEventListener('click', function(e) {
			for (var b = 0; b < toolicons.length; b++) {
				removeClass(toolicons[b], 'active');
			}
			this.setAttribute('class', this.getAttribute('class') + ' active');
			activeTool = this.getAttribute('id');
			tool_options.setAttribute('class', activeTool);

			toolLayer.removeEventListener('mousedown', mouseDown);
			toolLayer.removeEventListener('mouseup', mouseUp);
			toolLayer.removeEventListener('mousemove', mouseMove);
			document.removeEventListener('keydown', keyDown);
			document.removeEventListener('keyup', keyUp);
			//body.removeEventListener('mousemove', mouseMove);

			switch(activeTool) {
				case 'tool_select':
					//toolLayerContext.clear();

					var tx, ty, bx, by;
					var drawRect = function(x1, y1, x2, y2) {
						tx = Math.min(x1,x2);
						ty = Math.min(y1,y2);
						bx = Math.max(x1,x2);
						by = Math.max(y1,y2);

						toolLayerContext.setLineDash([0,0]);
						toolLayerContext.strokeStyle = '#BBBBBB';
						toolLayerContext.strokeRect(tx-0.5, ty-0.5, bx-tx, by-ty);
						toolLayerContext.setLineDash([4,3]);
						toolLayerContext.strokeStyle = 'black';
						toolLayerContext.strokeRect(tx-0.5, ty-0.5, bx-tx, by-ty);

					};

					var x1, x2, y1, y2;

					mouseDown = function(e) {
						if (isRMB(e))
							return;
						x2 = x1 = e.offsetX;
						y2 = y1 = e.offsetY;

						toolLayerContext.clear();

						drawRect(x1, y1, x2, y2);
						toolLayer.removeEventListener('mousemove', mouseMove);
						toolLayer.addEventListener('mousemove', mouseMove);
					};
					mouseMove = function(e) {
						x2 = e.offsetX;
						y2 = e.offsetY;

						toolLayerContext.clear();

						drawRect(x1, y1, x2, y2);
					};

					mouseUp = function(e) {
						toolLayer.removeEventListener('mousemove', mouseMove);
					};

					keyDown = function(e) {
						if (ctrlDown) {
							if (e.keyCode == nKey) {
								// new document
								createDocument('New '+documents.length, 400, 300);
								changeDocument(documents.length-1);
								e.preventDefault();
							} else if (e.keyCode == cKey) {
								// copy
								var realx1 = Math.max(tx - sceneOffsetLeft, 0),
									realx2 = Math.max(bx - sceneOffsetLeft, 0),
									realy1 = Math.max(ty - sceneOffsetTop, 0),
									realy2 = Math.max(by - sceneOffsetTop, 0);
								if (realx1 != realx2 && realy1 != realy2) {
									clipboard = {
										'type': 'pixels',
										'pixels': copyPixels(documents[documentId].layers[activeLayer], realx1, realy1, realx2, realy2)
									}
								}
							} else if (e.keyCode == vKey && clipboard != null && clipboard.type == 'pixels') {
								// paste
								createLayer('Layer '+(documents[documentId].layers.length+1));
								chooseLayer(documents[documentId].layers.length-1);
								var realx1 = Math.max(tx - sceneOffsetLeft, 0),
									realx2 = Math.max(bx - sceneOffsetLeft, 0),
									realy1 = Math.max(ty - sceneOffsetTop, 0),
									realy2 = Math.max(by - sceneOffsetTop, 0);
								pastePixels(documents[documentId].layers[activeLayer], clipboard.pixels, realx1, realy1);
							}
						}
					};

					toolLayer.addEventListener('mousedown', mouseDown);
					toolLayer.addEventListener('mouseup', mouseUp);
					document.addEventListener('keydown', keyDown);

					break;

				case 'tool_pencil':

					var prevx = null, prevy = null;
					var drawPixel = function(x, y) {
						// for smooth drawing
            if (prevx != null) {
							var steps = Math.max( Math.abs(x - prevx), Math.abs(y - prevy) );
							var stepx = x - prevx;
							var stepy = y - prevy;
              var a, b, s, tempx, tempy;
							for (var s = 0; s < steps; s++) {
								tempx = Math.floor(prevx + stepx*s/steps);
								tempy = Math.floor(prevy + stepy*s/steps);
								for (a = tempx-tool_pencil_width/2; a < tempx+tool_pencil_width/2; a++) {
									for (b = tempy-tool_pencil_width/2; b < tempy+tool_pencil_width/2; b++) {
										if (b > 0 && a > 0 && a < documents[documentId].width && b < documents[documentId].height) {
											setPixelData(documents[documentId].layers[activeLayer].context, documents[documentId].layers[activeLayer].pixels, Math.floor(a), Math.floor(b), tool_pencil_color);
										}
									}
								}
							}
						} else {
							for (var a = x-tool_pencil_width/2; a < x+tool_pencil_width/2; a++) {
								for (var b = y-tool_pencil_width/2; b < y+tool_pencil_width/2; b++) {
									if (b > 0 && a > 0 && a < documents[documentId].width && b < documents[documentId].height) {
										setPixelData(documents[documentId].layers[activeLayer].context, documents[documentId].layers[activeLayer].pixels, Math.floor(a), Math.floor(b), tool_pencil_color);
									}
								}
							}
						}
						prevx = x;
						prevy = y;

					};

					mouseDown = function(e) {
						if (isRMB(e))
							return;

						var target  = e.target || e.srcElement,
              rect    = target.getBoundingClientRect(),
              offsetX = e.clientX - rect.left,
              offsetY  = e.clientY - rect.top;

						e.offsetX = offsetX;
						e.offsetY = offsetY;
						var x = e.offsetX - sceneOffsetLeft;
						var y = e.offsetY - sceneOffsetTop;
						//console.log(x,y);
						drawPixel(x, y);
						toolLayer.removeEventListener('mousemove', mouseMove);
						toolLayer.addEventListener('mousemove', mouseMove);
					};

					mouseMove = function(e) {
						var target  = e.target || e.srcElement,
              rect    = target.getBoundingClientRect(),
              offsetX = e.clientX - rect.left,
              offsetY  = e.clientY - rect.top;

						e.offsetX = offsetX;
						e.offsetY = offsetY;
						var x = e.offsetX-sceneOffsetLeft;
						var y = e.offsetY-sceneOffsetTop;
            drawPixel(x, y);
					};

					mouseUp = function(e) {
						prevx = prevy = null;
						toolLayer.removeEventListener('mousemove', mouseMove);
					};

					toolLayer.addEventListener('mousedown', mouseDown);
					toolLayer.addEventListener('mouseup', mouseUp);

					break;

				case 'tool_erase':
					var erasePixel = function(x, y) {
						for (var a = x-tool_erase_width/2; a < x+tool_erase_width/2; a++) {
							for (var b = y-tool_erase_width/2; b < y+tool_erase_width/2; b++) {
								erasePixelData(documents[documentId].layers[activeLayer].context, documents[documentId].layers[activeLayer].pixels, Math.floor(a), Math.floor(b), tool_erase_opacity);
							}
						}
					};

					mouseDown = function(e) {
						if (isRMB(e))
							return;
						var x = e.offsetX-sceneOffsetLeft;
						var y = e.offsetY-sceneOffsetTop;
						erasePixel(x, y);
						toolLayer.removeEventListener('mousemove', mouseMove);
						toolLayer.addEventListener('mousemove', mouseMove);
					};

					mouseMove = function(e) {
						var x = e.offsetX-sceneOffsetLeft;
						var y = e.offsetY-sceneOffsetTop;
						erasePixel(x, y);
					};

					mouseUp = function(e) {
						toolLayer.removeEventListener('mousemove', mouseMove);
					};

					toolLayer.addEventListener('mousedown', mouseDown);
					toolLayer.addEventListener('mouseup', mouseUp);
					break;
				case 'tool_move':

					break;
			}

		});
	}

	// tool options
	var tool_pencil_color = [0, 0, 0, 255];
	var tool_pencil_width = 5;
	var tool_erase_width = 5;

	var tool_options = createElement('div');
	tool_options.setAttribute('id', 'tool_options');
	tool_options.innerHTML = '<ul class="tool_options tool_pencil_options">\
	<li><label>Color: <input id="tool_pencil_color" type="color" /></label></li>\
	<li><label>Size: <select id="tool_pencil_width"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5" selected="selected">5</option></select></label></li>\
	</ul>\
	<ul class="tool_options tool_erase_options">\
	<li><label>Size: <select id="tool_erase_width"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5" selected="selected">5</option><option value="10">10</option><option value="20">20</option></select></label></li>\
	<li><label>Opacity: <select id="tool_erase_opacity"><option value="2">0.01</option><option value="25">0.1</option><option value="51">0.2</option><option value="76">0.3</option><option value="102">0.4</option><option value="127">0.5</option><option value="255" selected="selected">1</option></select></label></li>\
	</ul>\
';
	panel_left.appendChild(tool_options);
	getElement('#tool_pencil_color').addEventListener('change', function(e) {
		var colors = [parseInt(this.value.substring(1, 3), 16), parseInt(this.value.substring(3, 5), 16), parseInt(this.value.substring(5, 7), 16), 255];
		tool_pencil_color = colors;
	});
	getElement('#tool_pencil_width').addEventListener('change', function(e) {
		tool_pencil_width = parseInt(this.value, 10);
	});
	getElement('#tool_erase_width').addEventListener('change', function(e) {
		tool_erase_width = parseInt(this.value, 10);
	});
	getElement('#tool_erase_opacity').addEventListener('change', function(e) {
		tool_erase_opacity = parseFloat(this.value, 10);
	});

	// popups
	var showDialog = function(id, options) {
		if (getElement('#'+id))
			return;
		var div = createElement('div');
		div.setAttribute('id', id);
		div.setAttribute('class', 'dialog');
		var html = '<div class="dialog_inner">'+options.content;
		html += '<div class="dialog_buttons">';
		if (options.button_cancel) {
			html += '<input type="button" class="button_cancel" value="Cancel" />';
		}
		if (options.button_ok) {
			html += '<input type="button" class="button_ok" value="OK" />';
		}
		html += '</div>';

		html += '</div>';
		div.innerHTML = html;
		impressorElem.appendChild(div);
		if (options.button_ok) {
			var button_ok = getElement('.button_ok', div);
			button_ok.addEventListener('click', function() {
				var data = collectDialogData(div);
				if (typeof options.button_ok === 'function')
					options.button_ok.call(this, data);
				hideDialog(id);
			}, false);
		}
		if (options.button_cancel) {
			var button_cancel = getElement('.button_cancel', div);
			button_cancel.addEventListener('click', function() {
				var data = collectDialogData(div);
				if (typeof options.button_cancel === 'function')
					options.button_cancel.call(this, data);
				hideDialog(id);
			}, false);
		}
	};
	var hideDialog = function(id) {
		impressorElem.removeChild(getElement('#'+id));
	};


	// layers
	var activeLayer = 0;
	var layers_elem = createElement('div');
	layers_elem.innerHTML = '<div class="panel-title">Layers</div>';
	layers_elem.setAttribute('id', 'layers');
	var layers_container = createElement('ul');
	layers_elem.appendChild(layers_container);
	var button_add_new_layer = createElement('a');
	button_add_new_layer.setAttribute('id', 'button_add_new_layer');
	button_add_new_layer.innerHTML = '+ Add new layer';
	button_add_new_layer.addEventListener('click', function() {
		createLayer('Layer '+(documents[documentId].layers.length+1));
		chooseLayer(documents[documentId].layers.length-1);
	}, false);
	layers_elem.appendChild(button_add_new_layer);
	panel_left.appendChild(layers_elem);

	// drag & drop stuff
	var dragTimeout = null;
	var onDragFileEnter = function(e) {
		clearTimeout(dragTimeout);
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		dragdrop_visual.setAttribute('class', 'active');
	};
	var onDragFileOver = function(e) {
		e.preventDefault();
	};
	var onDragFileLeave = function(e) {
		dragTimeout = setTimeout(function() {
			dragdrop_visual.setAttribute('class', '');
		}, 50);
	};
	var onDragFileEnd = function(e) {
		console.log('dragfileend');
	};
	var onDropFile = function(e) {
		e.preventDefault();
		console.log('dropfile');
		dragdrop_visual.setAttribute('class', '');
		for (var i = 0, f; f = e.dataTransfer.files[i]; i++) {
			console.log(f);
			if (!f.type.match('image.*')) {
				continue;
			}
			var reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = (function(theFile) {
				return function(e) {
					createDocument(theFile.name, 1, 1); // just 1x1 pixels for now
					changeDocument(documents.length-1);

					var image = new Image();
					image.onload = function() {
						resizeDocumentCanvas(documentId, image.width, image.height); // resize document to image size
						documents[documentId].layers[0].context.drawImage(image, 0, 0);
						documents[documentId].layers[0].pixels = documents[documentId].layers[0].context.getImageData(0, 0, image.width, image.height);
					};
					image.src = e.target.result;
				};
			})(f);

			// Read in the image file as a data URL.
			reader.readAsDataURL(f);
		}
	};
	var dragdrop_visual = createElement('div');
	dragdrop_visual.setAttribute('id', 'dragdrop');
	dragdrop_visual.innerHTML = '<div class="middle">+ Drop file here</div>';
	document.addEventListener('dragover', onDragFileEnter, false);
	document.addEventListener('dragover', onDragFileOver, false);
	document.addEventListener('dragleave', onDragFileLeave, false);
	document.addEventListener('dragend', onDragFileEnd, false);
	document.addEventListener('drop', onDropFile, false);
	impressorElem.appendChild(dragdrop_visual);
	var dragdrop_inner = getElement('#dragdrop .middle');

	// canvas
	var sceneCont = createElement('div');
	sceneCont.setAttribute('id', 'canvases');
	var sceneWidth = 1,
		sceneHeight = 1;
	removeClass(impressorElem, 'loading');
	var sceneBg = createElement('div');
	sceneBg.setAttribute('id', 'canvasesbg');
	impressorElem.appendChild(sceneBg);
	var backgroundWidth = 1;
	var backgroundHeight = 1;
	impressorElem.appendChild(sceneCont);
	var sceneOffsetLeft = 0;
	var sceneOffsetTop = 0;

	// tool layer
	var toolLayer = createElement('canvas');
	toolLayer.setAttribute('id', 'toollayer');
	toolLayer.width = backgroundWidth;
	toolLayer.height = backgroundHeight;
	var toolLayerContext = toolLayer.getContext('2d');

	// scene
	impressorElem.appendChild(toolLayer);

	var fitSceneToWindow = function(e) {
		var w = sceneWidth;
		var h = sceneHeight;
		backgroundWidth = Math.max(sceneWidth, window.innerWidth - 220);
		backgroundHeight = Math.max(sceneHeight, window.innerHeight - 50);
		sceneBg.style.overflow = 'hidden';
		sceneBg.style.width = backgroundWidth+'px';
		sceneBg.style.height = backgroundHeight+'px';
		toolLayer.width = backgroundWidth;
		toolLayer.height = backgroundHeight;
		sceneCont.style.overflow = 'hidden';
		sceneCont.style.width = w+'px';
		sceneCont.style.height = h+'px';
		setTimeout(function() {
			sceneBg.style.overflow = 'auto';
		}, 0);
		sceneOffsetLeft = Math.round(Math.max(backgroundWidth - w, 0) / 2);
		sceneOffsetTop = Math.round(Math.max(backgroundHeight - h, 0) / 2);
		sceneCont.style.left = 210 + sceneOffsetLeft + 'px';
		sceneCont.style.top = 41 + sceneOffsetTop + 'px';
	};
	window.addEventListener('resize', fitSceneToWindow, false);
	//context.fillStyle = 'rgb(255,255,255)';
	//context.fillRect(0, 0, sceneWidth, sceneHeight);

	// default documents
	var documentId = null;

	var documents = [];

	createDocument('New', 400, 300);
	changeDocument(0);
	selectTool('pencil');


	// draw loop
});
