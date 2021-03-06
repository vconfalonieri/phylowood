/*
The MIT License (MIT)

Copyright (c) 2013 Michael Landis, Trevor Bedford

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// namespace
var Phylowood = Phylowood || {};
var phw = Phylowood; // shortname


/***
INIT EVENT HANDLERS
***/
$(document).ready(function() {

    $('#textareaInput').on('dragover', function(event) {
        event.preventDefault();
        return false;
    });

    $('#textareaInput').on('dragend', function(event) {
        event.preventDefault();
        return false;
    });

    $('#textareaInput').on('drop', function(event) {
        event.preventDefault();
        inputFile = event.originalEvent.dataTransfer.files[0];
        readFile(inputFile, function (event) {
            $('#textareaInput').val(event.target.result);
            if ($("#checkboxAutoload").attr("checked") === "checked")
                Phylowood.initialize();
        });
    });
});

function readFile(file, onLoadCallback) {
    var reader = new FileReader();
    reader.onload = onLoadCallback;
    reader.readAsText(file);
}


/***
INPUT
***/

Phylowood.readInputFromHttp = function() {
	//this.inputHttp = $( "#textInputHttp" ).attr("value");
    this.inputHttp = window.location.search;

    console.log (this.inputHttp);
    
    // ignore empty queries
    if (this.inputHttp === "")
        return;

    // ignore non-URL queries
    if (this.inputHttp.slice(0,5) !== "?url=")
        return;

    var urlquery = this.inputHttp.slice(5,this.inputHttp.length);
    console.log(urlquery);


	$.get(urlquery, function(response) {
		Phylowood.inputStr = response;
	})
	.success(function() { })
	.error(function() { })
	.complete(function() { 
        $('#textareaInput').load(urlquery, function() {
            // callback
            if ($("#checkboxAutoload").attr("checked") === "checked")
                Phylowood.initialize();
        });
    });
};

Phylowood.loadInput = function() {

	var inputFile = $("#selectDemoData option:selected").val();	
	$('#textareaInput').load(inputFile, function() {
        // callback
        if ($("#checkboxAutoload").attr("checked") === "checked")
            Phylowood.initialize();
    });

};


$( "#selectDemoData" ).change(function() {

	// get current dropdown selection for demo data	
	var inputDemoOption = this.options[this.selectedIndex];

	// load input into text area
	if (inputDemoOption.value !== "nothing") {
		$.get(inputDemoOption.value, function(response) {
			Phylowood.inputStr = response;
		})
		.success(function() { })
		.error(function() { })
		.complete(function() { });
	}
});

Phylowood.clearCtrlInput = function() {
    d3.selectAll("#selectDemoData").remove();
    d3.selectAll("#checkboxAutoload").remove();
    d3.selectAll("#checkboxLabel").remove(); 
    d3.selectAll("#buttonApply").remove();
};


/***
INITIALIZE DATA
***/

Phylowood.initialize = function() {
	
	// reset system state
	//this.reset();
    this.clearCtrlInput();

	// parse input in inputTextArea
	this.parseInput();

	// initialize raw data
    console.log("initSettings\n")
    this.initSettings();
    console.log("initTaxa\n")
	this.initTaxa();
    console.log("initGeo\n")
	this.initGeo();
    console.log("initTree\n")
	this.initTree();
	
	// draw from data
    console.log("initNodeColors\n")
	this.initNodeColors();
    console.log("drawTree\n")
	this.drawTree();
    console.log("drawMap\n")
	this.drawMap();
	
    // initialize animation data
    console.log("initAnimationData\n")
    this.initAnimationData();

    if (this.modelType === "phylogeography"
        && this.areaType === "continuous")
    {
        this.drawMarkersContinuous();
    }
    else if (this.drawType === "pie"
        && this.areaType === "discrete")
    {
        this.drawMarkersDiscretePie();
    }

    this.initPlayer();
    this.initFilter();
};

Phylowood.parseInput = function() {

	// update inputStr from inputTextArea
	this.inputStr = $( "#textareaInput" ).val();
	if (this.inputStr === "") {
		console.log("WARNING: Phylowood.parseInput(): inputStr === \"\"");
		return;
	}
	
	// tokenize inputStr
	var inputTokens = this.inputStr.split(/\r\n|\r|\n/);
		
	// parse inputTokens
	this.treeStr = "";
	this.geoStr = "";
	this.taxaStr = "";
    this.settingsStr = "";
	var parseSelect = "";

	for (var i = 0; i < inputTokens.length; i++) {
        if (inputTokens[i] === "Begin phylowood;")
            parseSelect = "settings";
		else if (inputTokens[i] === "Begin geo;")
			parseSelect = "geo";
		else if (inputTokens[i] === "Begin taxa;")
			parseSelect = "taxa";
		else if (inputTokens[i] === "Begin trees;")
			parseSelect = "tree";
        else if (parseSelect === "settings")
            this.settingsStr += inputTokens[i] + "\n";
		else if (parseSelect === "geo")
			this.geoStr += inputTokens[i] + "\n";
		else if (parseSelect === "taxa")
			this.taxaStr += inputTokens[i] + "\n";
		else if (parseSelect === "tree")
			this.treeStr += inputTokens[i] + "\n";
		else
			; // do nothing
	}
};

Phylowood.initSettings = function() {
    
    // tokenize settingsTokens
    var settingsTokens;

    this.phyloTimeOffset = 0.0;
    this.phyloTimeUnit = "";
    this.pieSliceStyle = "even";
    this.pieFillStyle = "outwards";
    this.markerRadius = "300.0";
    this.drawType = "pie";
    this.modelType = "biogeography";
    this.areaType = "discrete";
    this.mapType = "clean";
    this.minAreaVal = 0.0;
    this.descriptionStr = "";
    this.colorType="full";
    this.tipColors=[];
    this.tipColorTypes=[];

    if (typeof this.settingsStr !== "undefined") {
        settingsTokens = this.settingsStr.split("\n");

        // assign phylowood settings
        for (var i = 0; i < settingsTokens.length; i++) {
            //console.log(settingsTokens[i])

            var s = trim1(settingsTokens[i]).split(/\s+/g);
            //var s = settingsTokens[i].split(" ");
            if (s[0] === "drawtype")
                Phylowood.drawType = s[1];
            else if (s[0] === "modeltype")
                Phylowood.modelType = s[1];
            else if (s[0] === "areatype")
                Phylowood.areaType = s[1];
            else if (s[0] === "pieslicestyle")
                Phylowood.pieSliceStyle = s[1];
            else if (s[0] === "timestart")
                Phylowood.phyloTimeOffset =  parseFloat(s[1]);
            else if (s[0] === "timeunit")
                Phylowood.phyloTimeUnit = s[1];
            else if (s[0] === "piefillstyle")
                Phylowood.pieFillStyle = s[1];
            else if (s[0] === "maptype")
                Phylowood.mapType = s[1];
            else if (s[0] === "markerradius")
                Phylowood.markerRadius = s[1];
            else if (s[0] === "minareaval")
                Phylowood.minAreaVal = s[1];
            else if (s[0] === "description")
            {
                for (var j = 1; j < s.length; j++)
                {
                    Phylowood.descriptionStr += s[j];
                    if (j !== s.length - 1)
                        Phylowood.descriptionStr += " ";
                }
            }
            else if (s[0] === "colortype")
                Phylowood.colorType = s[1];
            else if (s[0] === "tipcolors")
            {
                tc=[];
                for (var j = 1; j < s.length; j++)
                {
                    tc.push(parseInt(s[j]));
                }
                Phylowood.tipColors = tc;
            }
        }
    }
};

Phylowood.initTaxa = function() {

    this.taxaTokens = this.taxaStr.split('\n');
    this.numTaxa = -1;
    this.taxa = [];
    var taxaIdx = -1;

    for (var i = 0; i < this.taxaTokens.length; i++)
    {
        var lineTokens = trim1(this.taxaTokens[i]).split(/\s+/g);

        // get number of taxa
        if (lineTokens.length > 1)
            if (lineTokens[0] === 'Dimensions')
                this.numTaxa = parseInt(lineTokens[1].split('=')[1].slice(0,-1));

        // we populate taxa[] in the tree block
    }

    this.numTips = this.numTaxa;
};

Phylowood.initGeo = function() {

	// tokensize geoStr
	this.geoTokens = this.geoStr.split("\n");

	// assign geoTokens to geoCoords	
	var coordTokens;
	this.geoCoords = [];
    //this.maxGeoCoords = [-91.0, -181.0, 91.0, 181.0]; // [N, E, S, W]
	this.maxGeoCoords = [-Infinity, -Infinity, Infinity, Infinity]; // [N, E, S, W]
    var coordsIdx = -1;
	
	// input expects "latitude longitude"
	// maps to [i][0] and [i][1] resp.
	for (var i = 0; i < this.geoTokens.length; i++) {

        var lineTokens = trim1(this.geoTokens[i]).split(/\s+/g);
        
        // get number of areas
        if (lineTokens.length > 1)
            if (lineTokens[0] === 'Dimensions')
                this.numAreas = parseInt(lineTokens[1].split('=')[1].slice(0,-1));
        
        // get coordinates
        if (lineTokens[0] === 'Coords')
            coordsIdx = 0;

        else if (coordsIdx >= 0 && coordsIdx < this.numAreas)
        {
            if (lineTokens[2].indexOf(';') !== -1)
                lineTokens[2] = lineTokens[2].slice(0,-1);

            this.geoCoords[coordsIdx] =
            {
                name: lineTokens[0],
                lat: parseFloat(lineTokens[1]),
                lon: parseFloat(lineTokens[2])
            };

            if (this.geoCoords[coordsIdx].lat > this.maxGeoCoords[0]) // N
                this.maxGeoCoords[0] = this.geoCoords[coordsIdx].lat;
            if (this.geoCoords[coordsIdx].lon > this.maxGeoCoords[1]) // E
                this.maxGeoCoords[1] = this.geoCoords[coordsIdx].lon;
            if (this.geoCoords[coordsIdx].lat < this.maxGeoCoords[2]) // S
                this.maxGeoCoords[2] = this.geoCoords[coordsIdx].lat;
            if (this.geoCoords[coordsIdx].lon < this.maxGeoCoords[3]) // W
                this.maxGeoCoords[4] = this.geoCoords[coordsIdx].lon;

            coordsIdx++;
        }
    }

    /*
    if (this.maxGeoCoords[1] - this.maxGeoCoords[3] > -this.maxGeoCoords[3] - -this.maxGeoCoords[1])
    {
        for (var i = 0; i < this.geoCoords.length; i++)
        {
            if (this.geoCoords[i].lon < 0)
            {
                this.geoCoords[i].lon += 360;
            }
        }
    }
    */
	
	// construct distance matrix geoDistances
	this.distanceType = "Euclidean";
	this.geoDistances = [];
	for (var i = 0; i < this.numAreas; i++) {
		var distanceVals = [];
		for (var j = 0; j < this.numAreas; j++) {
			if (i === j) {
				distanceVals.push(0.0);
			}
			else {
				distanceVals.push( Phylowood.distance(
					this.geoCoords[i],
					this.geoCoords[j])
                );
			}
		}
		this.geoDistances.push(distanceVals);
	}

	/*
	console.log("Phylowood.initGeo():");
	console.log(this.geoCoords);
	console.log(this.divCoords);
	console.log(this.geoDistances);
*/
};

Phylowood.initTree = function() {

    // parse treeStr
    this.treeTokens = this.treeStr.split('\n');
    this.nhxStr = "";
    this.nodes = [];
    var nodeIdx = -1;
    
    for (var i = 0; i < this.treeTokens.length; i++) 
    {    
        var lineTokens = trim1(this.treeTokens[i]).split(/\s+/g).filter(function() { return true} );

        // get taxon names
        if (lineTokens[0] === 'Translate')
            nodeIdx = 0; 

        else if (nodeIdx >= 0 && nodeIdx < this.numTaxa)
        {    
            if (lineTokens[1].indexOf(';') !== -1 || lineTokens[1].indexOf(',') !== -1)
                lineTokens[1] = lineTokens[1].slice(0,-1);
            
            var idx = parseInt(lineTokens[0]);
            this.taxa[idx] = lineTokens[1].replace("_",". ");
            nodeIdx++;
        }    

        else if (lineTokens[0] === 'tree')
        {    
            if (lineTokens[2] === '=') 
                this.nhxStr = lineTokens[3];
            else {
                var lt = lineTokens[1];
                this.nhxStr = lt.slice(lt.indexOf('='),lt.length);
            }    
        }    
    }


    Phylowood.buildTree();
};    


Phylowood.buildTree = function() {

    console.log("buildTree\n");
	// parse Newick string
	var readTaxonName = false;
	var readBrlen = false;
    var readData = false;
	var temp = "";
	var newickTokens = [];

	for (var i = 0; i < this.nhxStr.length; i++) {
		var c = this.nhxStr[i];

		if (c === ' ')
			continue;
		if (   c === '(' || c === ')'
            || c === ':' || c === ';'
            || c === '[' || c === ']'
            || c === ',' || c === '&') {

			temp = c;
			newickTokens.push(temp);
			if ( c === ':' )
				readBrlen = true;
            else if (c === '(' || c === ')' || c === ';' || c == ',')
                readBrLen = false;
            else if (c === '[')
                readData = true;
            else if (c === ']')
                readData = false;

		}
		else {
			// the character is part of a taxon name
			var j = i;
			var taxonName = "";
			while ( this.nhxStr[j] !== '('
			     && this.nhxStr[j] !== ')'
			     && (this.nhxStr[j] !== ',' || readData === true)
			     && this.nhxStr[j] !== ':'
			     && this.nhxStr[j] !== ';'
                 && this.nhxStr[j] !== '['
                 && this.nhxStr[j] !== ']')
			{
				taxonName += this.nhxStr[j];
				j++;
			}
			newickTokens.push(taxonName);
			i = j - 1;
		}
		if ( c === ';' )
			break;
	}

	// construct Tree from newickTokens	
	this.nodes = [];
	this.root = null;
	var p = null;
    var readBrlen = false;
    var readData = false;

	for (var i = 0; i < newickTokens.length; i++) {
	
		// indicates new node
		if ( newickTokens[i] === "(" ) {

			if (p === null) {
				p = new Phylowood.Node;
				this.nodes.push(p);
				this.root = p;
			}
			else {
				var q = new Phylowood.Node;
				q.ancestor = p;
				this.nodes.push(q);
				p.descendants.push(q);
				p = q;
			}
			readBrlen = false;
            readData = false;
		}
		
		// indicates end of clade
		else if ( newickTokens[i] === ")" ) {
            if (p.ancestor !== null) {
            	p = p.ancestor;
            }
            else {
                console.log("Phylowood.initTree(): Problem going down tree");
            }
			readBrlen = false;
            readData = false;
		}
		
		// indicates divergence event
		else if ( newickTokens[i] === "," ) {
            if (p.ancestor !== null) {
                p = p.ancestor;
            }
            else {
                console.log("Phylowood.initTree(): Problem going down tree");
            }
			readBrlen = false;
            readData = false;
		}
		
		// next token is branch length
		else if ( newickTokens[i] === ":" )
		{
			readBrlen = true;
            readData = false;
		}

        // next token starts nhx data
        else if (newickTokens[i] === '[')
        {
            readBrlen = false;
            readData = true;
        }

        // next token ends nhx data
        else if (newickTokens[i] === ']')
        {
            readBrlen = false;
            readData = false;
        }

        // next token is a variable
        else if (newickTokens[i] === '&')
            ;
		
		// no tokens (should) remain
		else if ( newickTokens[i] === ";" ) {
			; // do nothing
		}
		else {
			// taxon name token
			if (!readBrlen && !readData) {
        		var tipIdx = parseInt(newickTokens[i]);
        		var tipName = this.taxa[tipIdx];

        		// internal node
        		if (newickTokens[i-1] === ")") {
        			p.id = tipIdx;
        			p.name = newickTokens[i];
        		}
        		
        		// tip node
        		else {
					var q = new Phylowood.Node;
					q.id = tipIdx;
					q.ancestor = p;
					q.name = tipName;
					this.nodes.push(q);
					p.descendants.push(q);
					p = q;
				}
			}
			
			// branch length token
			else if (readBrlen && !readData) {
				// reading a branch length 
				var x = parseFloat(newickTokens[i]);
				if (x < 0.00001)
					x = 0.00001;
                p.len = x;
				readBrlen = false;
			}

            // nhx data
            else if (readData)
            {
                // split for each variable by &
                nhxTokens = newickTokens[i].split('&');
                for (var j = 0; j < nhxTokens.length; j++) {

                    // find variable assignments
                    var varTokens = nhxTokens[j].split('=');

                    if (varTokens[0] === 'area_pp' || varTokens[0] === 'ch') {
                        valTokens = varTokens[1].slice(1,-1).split(',');
                        valVec = [];
                        for (var k = 0; k < valTokens.length; k++)
                        {
                            x = parseFloat(valTokens[k])
                            if (x < this.minAreaVal)
                                x = 0.0;
                            valVec[k] = x; 
                        }
                        p.states = valVec;
                    }
                    else {
                        ; // e.g. other variables
                    }
                }
            }
		}
	}

    this.numNodes = this.nodes.length;

	// assign states to nodes
	for (var i = 0; i < this.numNodes; i++) {
        this.nodes[i].id = i; 
	}

    // this is used to add a "false" branch to the root for phylo controls
    this.rootEnd = 0.0;

	// assign absolute times to nodes, defined as:
	// [t_begin, t_end] = [this.root.timeStart, max(this.nodes[i].timeEnd)]
	var setTime = function(p) {
		if (p.ancestor === null) {
			p.timeStart = 0.0;
			p.timeEnd = Phylowood.rootEnd;
		}
		if (p.ancestor !== null) {
			p.timeEnd = p.len + p.ancestor.timeEnd;
			p.timeStart = p.ancestor.timeEnd;
		}
		for (var i = 0; i < p.descendants.length; i++) {
			setTime(p.descendants[i], p.timeEnd);
		}
	}

    // initialize times to get tree height
	setTime(this.root);
	
	// determine time-based order of nodes (for animation purposes)
	this.nodesByTime = [];
	for (var i = 0; i < this.nodes.length; i++) {
		this.nodesByTime.push(this.nodes[i]);
	}
	this.nodesByTime
                    .sort(function(a,b){return a.timeEnd - b.timeEnd;})
                    .sort(function(a,b){return a.timeStart - b.timeStart;});


    // reset times with the "false" branch at the root
    this.rootEnd = 0.05 * this.nodesByTime[this.numNodes-1].timeEnd;
    this.root.len = this.rootEnd;
    setTime(this.root);

    // get phylo start and end times (treeheight + offset)
	this.startPhyloTime = this.nodesByTime[0].timeStart;
	this.endPhyloTime = this.nodesByTime[this.numNodes-1].timeEnd;
    for (var i = 0; i < this.numNodes; i++)
    {
        if (this.nodes[i].descendants.length === 0) { 
            var t = this.nodes[i].timeEnd;
            if (t > this.endPhyloTime)
                this.endPhyloTime = t;
        }
    }

    // assign treeLength
    this.treeLength = 0.0;
    for (var i = 0 ; i < this.numNodes; i++)
        this.treeLength += this.nodes[i].len;

    // assign treeHeight
    this.treeHeight = this.endPhyloTime - this.startPhyloTime;

    // clockticks when divergence events occur (populated later in animationData)
    this.divergenceTicks = [];
    this.divergenceTickIdx = 0;

    // assign clock and phylo time units
	this.curPhyloTime = this.startPhyloTime;
	this.startClockTime = 0.0;
	this.endClockTime = 60000.0; // animation lasts 30s
	if (this.areaType === "continuous")
        this.clockTick = 100.0; // update per .1s
    else if (this.areaType === "discrete")
        this.clockTick = 100.0;
    else
        this.clockTick = 1000.0;
	this.phyloTick = 0.0;
	this.phyloTick = (this.endPhyloTime - this.curPhyloTime) * (this.clockTick / this.endClockTime);
    this.numClockTicks = Math.ceil(this.endClockTime / this.clockTick) + 1;
    this.curClockTick = 0;
    this.prevClockTick = 0;


	// array of nodes by postorder traversal (for drawing the tree, F84 pruning, etc.)
	this.nodesPostorder = [this.numNodes];
	var poIdx = 0;

	var downPass = function(p) {
		if (p.descendants.length > 0) {
			for (var i = 0; i < p.descendants.length; i++) {
				downPass(p.descendants[i]);
			}
		}
	//	console.log(poIdx);
		Phylowood.nodesPostorder[poIdx] = p;
		poIdx++;
	}
	downPass(this.root);

    // tips by postorder
    this.nodesTipsPostorder = [];
    for (var i = 0; i < Phylowood.nodesPostorder.length; i++)
    {
        var p = this.nodesPostorder[i];
        if (p.descendants.length === 0)
        {
            Phylowood.nodesTipsPostorder.push(p);
        }
    }

    // array of nodes by id
    this.nodesById = [];
    for (var i = 0; i < this.numNodes; i++)
        this.nodesById[this.nodes[i].id] = this.nodes[i];

	var setContinuumDownPass = function(q, h) {

		// add this node to the heritage
		h.push(q.id);
		
		if (q.descendants.length > 0) {
			// have all immediate descendants do the same
			for (var i = 0; i < q.descendants.length; i++) {
				setContinuumDownPass(q.descendants[i], h);
			}
		}
	}

	var setContinuum = function(p, h) {
		
		var q = p,
		    r = null;

		// find lineage towards root
		if (p.ancestor !== null) {
			r = p;
			while (	r.ancestor !== null) {
				r = r.ancestor;
				p.heritage.push(r.id);
			}
		}
		
		// find clade towards tip
		setContinuumDownPass(p, p.heritage);		

	}
	for (var i = 0; i < this.numNodes; i++)
	{
		var p = this.nodesPostorder[i];
		setContinuum(p);
	}	

	// console.log(newickStr); console.log(newickTokens); console.log(this.nodes); console.log(this.nodesByTime);

};

Phylowood.Node = function() {
	return function(o, parentInstance){
		// initiate object
		this.id = 0; 
		this.level = 0;
		this.len = 0;
		this.timeStart = 0;		
		this.timeEnd = 0;
		this.ancestor = null;
		this.descendants = [];
		this.name = '';
		this.type = '';
		this.chart = {};
		this.img = [];
		this.color = [0,0,0];
		this.states = [];
		this.coord = 0;
		this.heritage = [];
		
		/* Cache Calculations */
		this._countAllChildren = false;
		this._countImmediateChildren = false;
		this._midBranchPosition = false;
		
		this.children = new Array();
		
		if(parentInstance){
			parentInstance.children.push(this); 
		}
	}
}();

Phylowood.Tree = function() {
	this.nodes = [];

};


/***
DRAW
***/

Phylowood.maskContinuumForBranch = function(d) {

    Phylowood.forceRedraw = true;
    Phylowood.forceHighlightToRedraw = true;

	// mask heritage of branch
	this.treeSvg.selectAll("line.phylo").select(
		function(b) {

			var found = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i])
					found = true;
			}
			//if (found) {
			if (found) {
				b.maskContinuum = true;
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.1);

	// mask heritage of branch's markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
			
			var found = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					found = true;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i])
                        found = true;
                }
			}
			if (found) {
                if (typeof m.maskContinuum !== "undefined")
				    m.maskContinuum = true;
                else if (typeof m.data !== "undefined")
                {
                    if (typeof m.data.maskContinuum !== "undefined")
                        m.data.maskContinuum = true;
                }
				return this;
			}
			else
				return null;
		}
	);//.style("visibility", "hidden");

    // update maskContinuum data for in animationData
    for (var i = 0; i < Phylowood.numAreas; i++)
    {
        for (var j = 0; j < Phylowood.animationData[i].length; j++)
        {
            for (var k = 0; k < d.heritage.length; k++)
            {
                if (Phylowood.animationData[i][j].id === d.heritage[k])
                {
                    Phylowood.animationData[i][j].maskContinuum = true;
                    k = d.heritage.length;
                }
            }
        }
    }
}

Phylowood.unmaskContinuumForBranch = function(d) {

    Phylowood.forceRedraw = true;
    Phylowood.forceHighlightToRedraw = true;

	// unmask heritage of branch				
	this.treeSvg.selectAll("line.phylo").select(
		function(b) {
			//console.log(b);
		
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i]) {
					b.maskContinuum = false;
					return this;
				}
			}
		}
	).style("stroke-opacity", 1.0);	

	// unmask heritage of branch for markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
		
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					m.maskContinuum = false;
					return this;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i]) {
                        m.data.maskContinuum = false;
                        return this;
                    }
                }
			}

		}
	);//.attr("visibility","visible");
    
    // update maskContinuum data for in animationData
    for (var i = 0; i < Phylowood.numAreas; i++)
    {
        for (var j = 0; j < Phylowood.animationData[i].length; j++)
        {
            for (var k = 0; k < d.heritage.length; k++)
            {
                if (Phylowood.animationData[i][j].id === d.heritage[k])
                {
                    Phylowood.animationData[i][j].maskContinuum = false;
                    k = d.heritage.length;
                }
            }
        }
    }
}


Phylowood.highlightContinuumForBranch = function(d) {

    Phylowood.forceRedraw = true;

	// mask branches not part of heritage
	this.treeSvg.selectAll("line.phylo").select(
		function(b) {
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i])
                {
                    b.highlightContinuum = true;
					ancestral = true;
                }
			}
			if (!ancestral) {
                b.highlightContinuum = false;
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.1);

	// mask heritage of branch's markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
			
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
                    m.highlightContinuum = true;
					ancestral = true;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i])
                    {
                        m.data.highlightContinuum = true;
                        ancestral = true;
                    }
                }
			}
			if (!ancestral) {
                if (typeof m.data !== "undefined")
                    m.data.highlightContinuum = false;
                else
                    m.highlightContinuum = false;
				return this;
			}
			else
				return null;
		}
	).style("fill-opacity", 0.1);
	
    // mask heritage of branch's tracers
	d3.selectAll("#divGeo .tracer").select(
		function(m) {
			
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					ancestral = true;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i])
                        ancestral = true;
                }
			}
			if (!ancestral) {
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.1);

    // display lineage information
    d3.selectAll("#divPhylo svg").append("svg:text")
        .text(function() { return d.name; })
        .attr("x", function() { return d.x2phy + 5; })
        .attr("y", function() { return d.y2phy - 5; })
        .attr("transform", function() {
            return "rotate(270 " + d.x2phy + "," + d.y2phy + ")";
        })
        .attr("dx", function() {
            var bbox = this.getBBox();
            var w = bbox.width;
            var y = bbox.y;
            if (y - w < 0) return -(w + 10);
        })
        .attr("dy", function() {
            var bbox = this.getBBox();
            var h = bbox.height;
            var x = bbox.x;
            if (x - h < 0) return (h + 5);
        })
        .style("fill", function() { return d.color; })

    // permanent labels
    
    var yStart, yMod, yVal;
    yStart = 24; yMod = 21; yVal = yStart;    

    this.svgFilter.append("svg:text")
        .text("Lineage id:")
        .attr("x", 435)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;        
    
    this.svgFilter.append("svg:text")
        .text("Lineage name:")
        .attr("x", 435)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;        

    this.svgFilter.append("svg:text")
        .text("Lineage start:")
        .attr("x", 435)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;        

    this.svgFilter.append("svg:text")
        .text("Lineage end:")
        .attr("x", 435)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;        

	yVal = yStart;
    this.svgFilter.append("svg:text")
        .text(function() { return d.id; })
        .attr("x", 595)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;      

    this.svgFilter.append("svg:text")
        .text(function() { return d.name; })
        .attr("x", 595)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;        

    this.svgFilter.append("svg:text")
        .text(function() {
            var t = d.timeStart + Phylowood.phyloTimeOffset;
            return t.toFixed(2) + " " + Phylowood.phyloTimeUnit;
        })
        .attr("x", 595)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;            
    
    this.svgFilter.append("svg:text")
        .text(function() {
            var t = d.timeEnd + Phylowood.phyloTimeOffset;
            return t.toFixed(2) + " " + Phylowood.phyloTimeUnit;
        })
        .attr("x", 595)
        .attr("y", yVal)
        .attr("class","infoBranch")
        .style("fill","white");
    yVal += yMod;            
    
    for (var i = 0; i < Phylowood.numAreas; i++)
    {
        for (var j = 0; j < Phylowood.animationData[i].length; j++)
        {
            for (var k = 0; k < d.heritage.length; k++)
            {
                var found = false;
                if (Phylowood.animationData[i][j].id === d.heritage[k])
                {
                    found = true;
                    k = d.heritage.length;
                }
            }
            if (found)
                Phylowood.animationData[i][j].highlightContinuum = true;
            else
                Phylowood.animationData[i][j].highlightContinuum = false;
        }
    }
    if (Phylowood.forceHighlightToRedraw = true)
    {
        Phylowood.updateMarkers();
    }
    Phylowood.forceHighlightToRedraw = false;
}

Phylowood.unhighlightContinuumForBranch = function() {

    Phylowood.forceRedraw = true;

	// unmask all branches 
	this.treeSvg.selectAll("line.phylo").select(
		function(b) {
			if (b.maskContinuum === false)
				return this;
		}
	).style("stroke-opacity", 1.0);

	// unmask all markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
			if (m.maskContinuum === false)
            {
                m.highlightContinuum = true;
				return this;
            }
            else if (typeof m.data !== "undefined")
            {
                if (m.data.maskContinuum === false)
                {
                    m.data.highlightContinuum = true;
                    return this;
                }
            }
		}
	).style("fill-opacity", 1.0);
	
    // unmask all tracers
	d3.selectAll("#divGeo .tracer").select(
		function(m) {
			if (m.maskContinuum === false)
				return this;
            else if (typeof m.data !== "undefined")
            {
                if (m.data.maskContinuum === false)
                    return this;
            }
		}
	).style("stroke-opacity", 1.0);

    // erase lineage information
    d3.selectAll("#divPhylo svg text").remove();
    this.svgFilter.selectAll(".infoBranch").remove();
    //transition().attr("visibility","hidden"); // fade out??
    
    for (var i = 0; i < Phylowood.numAreas; i++)
    {
        for (var j = 0; j < Phylowood.animationData[i].length; j++)
        {
            Phylowood.animationData[i][j].highlightContinuum = true;
        }
    }
    if (Phylowood.forceHighlightToRedraw = true)
    {
        Phylowood.updateMarkers();
    }
    Phylowood.forceHighlightToRedraw = false;
}

Phylowood.drawTree = function() {

	// simply remove for now
	// ...eventually, tie in to .reset()
	// ...mask/unmask or delete/recreate
	$( "#textareaInput" ).remove();
	
	var divH = $("#divPhylo").height(),
		divW = $("#divPhylo").width(),
		unitsH = divH / (this.numTips - 1),
		unitsW = divW / (this.endPhyloTime - this.startPhyloTime);
		
	this.treeSvg = d3.select("#divPhylo")
	                   .append("svg:svg")
	                   .attr("width",divW)
	                   .attr("height",divH);
		
	// format data to JSON
	this.phyloDrawData = [];
	
	// first pass, assigning tips to positions 0, 1, 2, ... 
	var count = 0;
	for (var i = 0; i < this.numNodes; i++) {
	
		// grab node
		var p = this.nodesPostorder[i];
		
		// check if tip and assign if yes
		if (p.descendants.length === 0) {
			p.coord = count;
			count++;
		}
	
	}
	
	// second pass, setting coord based on child nodes
	for (var i = 0; i < this.numNodes; i++) {
		
		// grab node
		var p = this.nodesPostorder[i];	
		
		// parent node is average of child nodes
		if (p.descendants.length > 0) {
			p.coord = 0.0;
			for (var j = 0; j < p.descendants.length; j++)
				p.coord += p.descendants[j].coord;
			p.coord /= p.descendants.length;
		}
		
	}
	
	// third pass, setting branch attributes
	for (var i = 0; i < this.numNodes; i++) {
		
		// grab node and parent node
		var p = this.nodesPostorder[i],
			pp = p.ancestor;
		
		// if parent exists, draw branch
		//if (pp !== null) {

			var c = p.color,
			//	pc = pp.color,		
				xStart = p.timeStart * unitsW,
				xEnd = p.timeEnd * unitsW,
//				yStart = pp.coord * unitsH,
				yEnd = p.coord * unitsH,
				heritage = p.heritage,
                name = p.name;

			// offset the borders by linewidth
//			if (p.ancestor === null)	xStart += 2;
			if (yEnd == divH) yEnd -= 2;
			if (yStart == divH) yStart -=2;
			if (yStart == 0.0) yStart += 2;
			if (yEnd == 0.0) yEnd +=2;


			// add horizontal lines
			this.phyloDrawData.push({
				"id": p.id,
				"timeStart": p.timeStart,
				"timeEnd": p.timeEnd,
				"x1phy": xStart,
				"x2phy": xEnd,
				"y1phy": yEnd,
				"y2phy": yEnd,
				"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
				"maskContinuum": false,
                "highlightContinuum": true,
				"heritage": heritage,
                "name": name
			});
			
			if (pp !== null) {
				var pc = pp.color,
					yStart = pp.coord * unitsH;
			
				// add vertical lines
				this.phyloDrawData.push({
					"id": p.id,
					"timeStart": p.timeEnd,
					"timeEnd": p.timeEnd,
					"x1phy": xStart,
					"x2phy": xStart,
					"y1phy": yStart,
					"y2phy": yEnd,
					"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
					"maskContinuum": false,
                    "highlightContinuum": true,
					"heritage": heritage,
                    "name": name
					});

			}

            // get x root position for time ticks
            else
                this.xRoot = xEnd;
				
	//	}
				
	}

	this.treeDrawLines_box = this.treeSvg.selectAll("line.phylo_box")
				.data(this.phyloDrawData)
				.enter()
				.append("svg:line")
                .attr("class","phylo_box")
				.attr("x1", function(d) { return d.x1phy; })
				.attr("x2", function(d) { return d.x2phy; })
				.attr("y1", function(d) { return d.y1phy; })
				.attr("y2", function(d) { return d.y2phy; })
				.style("stroke", function(d) { return d.color; })
                .style("stroke-opacity", 0.0)
				.style("stroke-width", 20)
				.on("mouseover", function(d) {
					Phylowood.highlightContinuumForBranch(d);
				})
				.on("mouseout", function(d) {
					Phylowood.unhighlightContinuumForBranch();
				})
				.on("click", function(d) {
					Phylowood.unmaskContinuumForBranch(d);
				})
				.on("dblclick", function(d) {
					Phylowood.maskContinuumForBranch(d);
				});

	
	this.treeDrawLines = this.treeSvg.selectAll("line.phylo")
				.data(this.phyloDrawData)
				.enter()
				.append("svg:line")
                .attr("class","phylo")
				.attr("x1", function(d) { return d.x1phy; })
				.attr("x2", function(d) { return d.x2phy; })
				.attr("y1", function(d) { return d.y1phy; })
				.attr("y2", function(d) { return d.y2phy; })
				.style("stroke", function(d) { return d.color; })
				.style("stroke-width", 2.5)
				.on("mouseover", function(d) {
					Phylowood.highlightContinuumForBranch(d);
				})
				.on("mouseout", function(d) {
					Phylowood.unhighlightContinuumForBranch();
				})
				.on("click", function(d) {
					Phylowood.unmaskContinuumForBranch(d);
				})
				.on("dblclick", function(d) {
					Phylowood.maskContinuumForBranch(d);
				});

    // #divTimeTicks settings
	divHtt = $("#divTimeTicks").height();
	divWtt = $("#divTimeTicks").width();

  	this.svgTimeTicks = d3.selectAll("#divTimeTicks").append("svg");

    this.curPhyloTimeText = this.svgTimeTicks.append("svg:text")
        .text("")
        .attr("x", 100)
        .attr("y", 20)
        .style("fill","white")        
        .style("font-size", "16") 
        .style("text-anchor", "end");

    
    d3.selectAll("#divDescription").append("svg").append("svg:text")
        .text(Phylowood.descriptionStr)
        .attr("x", 0)
        .attr("y", 20)
        .style("fill","white")
        .style("font-size", "16");
    
    /*

    // lineages per tick?? e.g.
    // n = " "
    this.svgFilter.append("svg:text")
        .text("Active lineages:")
        .attr("x", 10)
        .attr("y", 40)
        .attr("class","infoPerm")
        .style("fill","white");
    
    this.curPhyloLineageCount = this.svgFilter.append("svg:text")
        .text("")
        .attr("x", 190)
        .attr("y", 40)
        .attr("class","infoPerm")
        .style("fill","white");
    */
}

Phylowood.initNodeColors = function() {
	
    var hStart=0.0;
    var hEnd=300.0;
    if (Phylowood.colorType==="redless")
    {
        hStart=60.0;
        hEnd=240.0;
    }
    else if (Phylowood.colorType==="greenless")
    {
        hStart=180.0;
        hEnd=360.0;
    }
    console.log(hStart,hEnd);
	var lStep = 0.6 / this.treeHeight; //(this.nodesByTime[this.numNodes-1].timeEnd - this.nodesByTime[0].timeStart);
	var hStep = (hEnd-hStart) / (this.numTips - 1);

	var lValue = 0.0;
    //var hValue = 0.0;
    var hValue = hStart;

	// assign colors uniformly across tips
	for (var i = 0; i < this.numNodes; i++) {
		if (this.nodes[i].descendants.length === 0) {

            // see if color specified for tip
			lValue = 1.0 - lStep*this.nodes[i].timeEnd;
			this.nodes[i].color = [hValue, 1, lValue];
			hValue += hStep;
		}
	}

    // assign tip colors if given
    if (this.colorType==="userdefined")
    {
        for (var i = 0; i < this.nodesTipsPostorder.length; i++)
        {
			lValue = 1.0 - lStep*this.nodesTipsPostorder[i].timeEnd;
            this.nodesTipsPostorder[i].color = [this.tipColors[i], 1, lValue];
        }
    }

	// set internal nodes based on tip colors
	for (var i = this.numNodes-1; i >= 0; i--) {
		if (this.nodesByTime[i].descendants.length > 0) {

			// get average color of descendants
			var hTemp = 0.0;
			for (var j = 0; j < this.nodesByTime[i].descendants.length; j++) {
				hTemp += this.nodesByTime[i].descendants[j].color[0];
			}
			hTemp /= this.nodesByTime[i].descendants.length;
			lValue = 1.0 - lStep*this.nodesByTime[i].timeEnd;
	
			this.nodesByTime[i].color = [hTemp, 1, lValue];
			
		}
	}
}


Phylowood.initAnimationData = function() {

    // animation data structure for generic drawType
	this.animationData = [];
    
    // animation path strings for drawType==="pie"
    this.animationPathStr = [];

    // discrete areas: values change, coordinates constant
    if (this.areaType === "discrete")
    {
        // for each area
        for (var j = 0; j < this.numAreas; j++)
        {
            this.animationData[j] = [];

            // pre-compute basic lineage information
            var val = [];
            var tClockStart = [],
                tClockEnd = [],
                tClockDuration = [],
                startClockIdx = [],
                endClockIdx = [],
                numClockIdx = [],
                color = [],
                vTick = [];


            // can speed up code by rearranging for loops (most of this is independent of j;
            //     the reset can be placed in the per-lineage loop below)
            for (var i = 0; i < this.numNodes; i++)
            {
                // get the node and its ancestor (or if it is the root, itself)
                var p = this.nodesPostorder[i];
                var q = p.ancestor || p;
                //val[i] = 0;
                val[i] = p.states[j];
                //if (typeof p.states[j] === undefined)
                //    console.log(i,j,p);

                // time lineage i exists
                tClockStart[i]  = (p.timeStart / this.treeHeight) * this.endClockTime;
                tClockEnd[i] = (p.timeEnd / this.treeHeight) * this.endClockTime;
                tClockDuration[i] = tClockEnd[i] - tClockStart[i];
                startClockIdx[i] = Math.ceil(tClockStart[i] / this.clockTick);
                endClockIdx[i] = Math.ceil(tClockEnd[i] / this.clockTick);
                numClockIdx[i] = endClockIdx[i] - startClockIdx[i] + 1;
                
                // vals and vTicks 
                vTick[i] = (q.states[j] - p.states[j]) / numClockIdx[i];
                //console.log(val[i], p.states[j]);

                // lineage colors
                var c = p.color;
                color[i] = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";

                // populate divergenceTicks[], excluding 0
                this.divergenceTicks.push(startClockIdx[i]);
                // also treat terminal taxa as divergence events
                if (p.descendants.length === 0)
                    this.divergenceTicks.push(endClockIdx[i]);
            }
            
            // use jQuery to gather array of unique divergence times
            // used for animation of discrete pie
            //this.divergenceTicks = $.unique(this.divergenceTicks).reverse();
            //this.dticks2 = $.unique(this.divergenceTicks.sort()).reverse();
            
            // ... I'm beginning to distrust console.log, but $.unique and .sort()
            //     don't seem to produce the correct results.

            var temp = [ this.divergenceTicks[0] ];

            //console.log(phw.divergenceTicks);
            for (var i = 1; i < this.divergenceTicks.length; i++)
            {
                // already in temp[]?
                var found = false;

                for (var k = 0; k < temp.length; k++)
                {
                    if (this.divergenceTicks[i] === temp[k])
                    {
                        found = true;
                    }
                }
                
                // if not in temp[], add in sorted order
                if (found === false)
                {
                    var addIdx = 0;
                    for (var k = 0; k < temp.length; k++)
                    {
                        if (this.divergenceTicks[i] > temp[k])
                        {
                            addIdx++;
                        }
                    }
                    temp.splice(addIdx,0,this.divergenceTicks[i]);
                }
            }
            this.divergenceTicks = temp;


            // UNEXPECTED BEHAVIOR
            // console.log() DOES NOT report val correctly to Google Chrome
            // alert() has no problem.
            // alert(val);
            // console.log(val);

            // for each lineage (i indexes nodesPostorder)
            for (var i = 0; i < this.numNodes; i++)
            {
                var saveV = false; 
                var v = [];
                var show = [];

                // for each tick in [startClockIdx,endClockIdx] 
                for (var k = this.numClockTicks; k >= 0; --k)
                {
                    // get current value and tick size
                    if (k >= startClockIdx[i] && k < endClockIdx[i])
                    {
                        v[k] = val[i];
                        show[k] = 1;
                        // if (val[i] > 0)
                            saveV = true;
                        val[i] += vTick[i];
                    }
                    else if (k === endClockIdx[i] && k === this.numClockTicks - 1)
                    {
                        saveV = true;
                        show[k] = 1;
                        v[k] = val[i];
                    }
                    else if (k < startClockIdx[i] || k >= endClockIdx[i])
                    {
                        show[k] = 0;
                    }
                }
                // console.log(valArray[k]);
                if (saveV === true)
                {
                    x = {
                        "name": this.nodesPostorder[i].name,
                        "id": this.nodesPostorder[i].id,
                        "area": j,
                        "val": v,
                        "show": show,
                        "coord": {"lat":this.geoCoords[j].lat, "lon":this.geoCoords[j].lon},
                        "color": color[i],
                        "startClockTick": startClockIdx[i],
                        "endClockTick": endClockIdx[i],
                        "maskContinuum": false,
                        "highlightContinuum": true
                    };
                    //console.log(j,i,x);
                    this.animationData[j].push(x);
                }
            }
        }
    }

    // continuous areas: coordinates change, values constant
    // marker per lineage, interpolated values
    else if (this.areaType === "continuous")
    {
        // for each lineage, postorder
        for (var i = 0; i < this.numNodes; i++)
        {
            // get the node and its ancestor (or if it is the root, itself)
            var p = this.nodesPostorder[i];
            var q = p.ancestor || p;
            // console.log(p.id,q.id);
            
            // time lineage i exists
            var tClockStart = (p.timeStart / this.treeHeight) * this.endClockTime;
            var tClockEnd = (p.timeEnd / this.treeHeight) * this.endClockTime;
            var tClockDuration = tClockEnd - tClockStart;
            var startClockIdx = Math.ceil(tClockStart / this.clockTick);
            var endClockIdx = Math.ceil(tClockEnd / this.clockTick);
            var numClockIdx = endClockIdx - startClockIdx;// + 1;

            // lineage values
            var c = p.color;
            var color = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";


            // find the currently and ancestrally occupied areas
            var ancAreaIdx = -1;
            var curAreaIdx = -1;

            for (var j = 0; j < this.numAreas; j++) {
                if (q.states[j] > 0.0)
                    ancAreaIdx = j;
                if (p.states[j] > 0.0) 
                    curAreaIdx = j;
            }

            // get current value and tick size
            var lat = parseFloat(this.geoCoords[curAreaIdx].lat);
            var lon = parseFloat(this.geoCoords[curAreaIdx].lon);
            var ancLat = parseFloat(this.geoCoords[ancAreaIdx].lat);
            var ancLon = parseFloat(this.geoCoords[ancAreaIdx].lon);
            var latTick = (ancLat - lat) / numClockIdx;
            var lonTick = (ancLon - lon) / numClockIdx;
            var val = 1.0;

            var latArray = [];
            var lonArray = [];
            var coordArray = [];

            // interpolate coordinates, constant values
            for (var k = this.numClockTicks; k >= 0; --k)
            {
                if (k === endClockIdx)
                {
                    coordArray[k] = {"lat":String(lat), "lon":String(lon)};
                }
                else if (k >= startClockIdx && k < endClockIdx)
                {
                    lat += latTick;
                    lon += lonTick;
                    coordArray[k] = {
                        "lat":String(lat),
                        "lon":String(lon)
                    };
                }
            }
            this.animationData.push({
                "name": p.name,
                "id": p.id,
                "val": val,
                "coord": coordArray,
                "color": color,
                "startClockTick": startClockIdx,
                "endClockTick": endClockIdx,
                "maskContinuum": false
            });
        }
	}
};

Phylowood.highlightContinuumByMarker = function(m) {
    var lat, lon, val, name;
    if (typeof m.data !== "undefined")
    {
        val = m.data.val[Phylowood.curClockTick];
        lat = m.data.coord.lat;
        lon = m.data.coord.lon;
        name = m.data.name;

        for (var i = 0; i < this.numNodes; i++)
            if (this.nodes[i].id === m.data.id)
                this.highlightContinuumForBranch(this.nodes[i]);

    }
    else if (typeof m.coord !== "undefined")
    {
        val = m.val;
        lat = m.coord[Phylowood.curClockTick].lat;
        lon = m.coord[Phylowood.curClockTick].lon;
        name = m.name;
        for (var i = 0; i < this.numNodes; i++)
            if (this.nodes[i].id === m.id)
                this.highlightContinuumForBranch(this.nodes[i]);
    }
    
    var yStart, yMod, yVal;
    yStart = 24; yMod = 21; yVal = yStart;
    
    this.svgFilter.append("svg:text")
        .text("Marker name:")
        .attr("x", 10)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;

    this.svgFilter.append("svg:text")
        .text("Marker latitude:")
        .attr("x", 10)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;        

    this.svgFilter.append("svg:text")
        .text("Marker longitude:")
        .attr("x", 10)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;        

    this.svgFilter.append("svg:text")
        .text("Marker value:")
        .attr("x", 10)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;      
     
	yVal = yStart;
    this.svgFilter.append("svg:text")
        .text(name)
        .attr("x", 190)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;              

    this.svgFilter.append("svg:text")
        .text(parseFloat(lat).toFixed(2))
        .attr("x", 190)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;              

    this.svgFilter.append("svg:text")
        .text(parseFloat(lon).toFixed(2))
        .attr("x", 190)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;              
    
    this.svgFilter.append("svg:text")
        .text(val.toFixed(2))
        .attr("x", 190)
        .attr("y", yVal)
        .attr("class","infoMarker")
        .style("fill","white");
    yVal += yMod;              

};

Phylowood.unhighlightMarkerByContinuumInfo = function(m) {
/*
    if (typeof m.data !== "undefined") {
        for (var i = 0; i < this.numNodes; i++)
            if (this.nodes[i].id === m.data.id)
                this.highlightContinuumForBranch(this.nodes[i]);
    }
    else if (typeof m.coord !== "undefined") {
        for (var i = 0; i < this.numNodes; i++)
            if (this.nodes[i].id === m.id)
                this.highlightContinuumForBranch(this.nodes[i]);
    }
    */
    this.unhighlightContinuumForBranch();
    this.svgFilter.selectAll(".infoMarker").remove();
};

Phylowood.drawMarkersContinuous = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// geo data
	var data = this.animationData; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [];
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
		foci[i] = this.map.locationPoint(coords[i]);

    // add xy coordinates to markers
    data.forEach(function(d) {
        d.x = [];
        d.y = [];
        for (var i = 0; i < Phylowood.numClockTicks; i++)
        {
            if (typeof d.coord[i] !== "undefined")
            {
                xy = Phylowood.map.locationPoint(d.coord[i]);
                d.x[i] = xy.x;
                d.y[i] = xy.y;
            }
        }
    });

    // draw circle markers
    var layer = d3.select("#divGeo svg");
    this.node = layer.selectAll("circle.marker")
        .data(data)
      .enter().append("svg:circle")
        .attr("class","marker")
        .attr("cx", function(d) { return d.x[d.startClockTick]; })
        .attr("cy", function(d) { return d.y[d.startClockTick]; })
        .attr("r", function(d) {
            var v = Phylowood.markerRadius * d.val;
            return Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom) * Math.sqrt(v);
        })
        .attr("fill", function(d) { return d.color })
        .attr("stroke-width", 1)
        .attr("fill-opacity", 1)
        .attr("visibility", function(d) {
            if (d.startClockTick <= Phylowood.curTick && d.endClockTick >= Phylowood.curTick)
                return "visible";
            else
                return "hidden";
        })
        .on("mouseover", function(d) {
            Phylowood.highlightContinuumByMarker(d);
        })
        .on("mouseout", function(d) {
            Phylowood.unhighlightMarkerByContinuumInfo(d);
        })
        ;

    // draw lines
    this.nodelines = layer.selectAll("line.tracer")
        .data(data)
      .enter().append("svg:line")
        .attr("class","tracer")
        .attr("x1", function(d) { return d.x[d.startClockTick]; })
        .attr("y1", function(d) { return d.y[d.startClockTick]; })
        .attr("x2", function(d) { return d.x[d.startClockTick]; })
        .attr("y2", function(d) { return d.y[d.startClockTick]; })
        .attr("stroke", function(d) { return d.color; })
        .style("stroke-width", function() {
            var v = Phylowood.markerRadius * 0.5;
            return Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom) * Math.sqrt(v);
        });
    
    // rescale continuous markers if the map perspective changes
	this.map.on("move", function() {

        Phylowood.zoomPauseAnimation = true;

		// get new map-to-pixel coordinates for all states
        data.forEach(function(d) {
            d.x = [];
            d.y = [];
            for (var i = 0; i < Phylowood.numClockTicks; i++)
            {
                if (typeof d.coord[i] !== "undefined")
                {
                    xy = Phylowood.map.locationPoint(d.coord[i]);
                    d.x[i] = xy.x;
                    d.y[i] = xy.y;
                }
            }
        });
		
		// update positions and radii for nodes
		Phylowood.node
            .attr("cx", function(d) { 
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.x[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.x[d.endClockTick];
                else
                    return d.x[Phylowood.curClockTick];
            })
            .attr("cy", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.y[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.y[d.endClockTick];
                else
                    return d.y[Phylowood.curClockTick];
            })
		    .attr("r", function(d) {
                var v = Phylowood.markerRadius * d.val;
                return Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom) * Math.sqrt(v);
            });

        Phylowood.nodelines
            .attr("x1", function(d) { return d.x[d.startClockTick]; })
            .attr("y1", function(d) { return d.y[d.startClockTick]; })
            .attr("x2", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.x[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.x[d.endClockTick];
                else
                    return d.x[Phylowood.curClockTick];
            })
            .attr("y2", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.y[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.y[d.endClockTick];
                else
                    return d.y[Phylowood.curClockTick];
            })
            .style("stroke-width", function() {
                var v = Phylowood.markerRadius * 0.5;
                return Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom) * Math.sqrt(v);
            });
	});	
}

Phylowood.drawMarkersDiscretePie = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// geo data
	var data = this.animationData;
	var coords = this.geoCoords;
	var foci = [];
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
    {
		foci[i] = this.map.locationPoint(coords[i]);

        // add xy coordinates to markers
        data[i].forEach(function(d)
        {
            if (typeof d !== "undefined")
            {
                xy = Phylowood.map.locationPoint(d.coord);
                d.x = xy.x;
                d.y = xy.y;
            }
        });
    }

    // pie chart variables

    // pieSliceStyle
    if (this.pieSliceStyle === "full")
    {
        this.donut = d3.layout.pie().sort(null).value(function(d) {
            if (typeof d.val[Phylowood.curClockTick] !== "undefined")
                //&& typeof d.val[Phylowood.curClockTick + Phylowood.playTick] !== "undefined")
            {
                if (d.maskContinuum === false) 
                {
                    var v = Math.ceil(d.val[Phylowood.curClockTick]);
                    if (v === 0) return 0.0001;
                    else return v;
                    //return Math.ceil(d.val[Phylowood.curClockTick]);
                }
            }
            return 0;
        });
    }
    else if (Phylowood.pieSliceStyle === "even")
    {
        this.donut = d3.layout.pie().sort(null).value(function(d) {
            if (typeof d.val[Phylowood.curClockTick] !== "undefined")
                //&& typeof d.val[Phylowood.curClockTick + Phylowood.playTick] !== "undefined")
            {
                if (d.maskContinuum === false) 
                {
            //        return Math.ceil(d.val[Phylowood.curClockTick]);
                    return 1;
                }
            }
            return 0;
        });
    }

    // pieFillStyle
    if (this.pieFillStyle === "inwards")
    {
        this.arc = d3.svg.arc()
            .startAngle(function(d) { return d.startAngle; })
            .endAngle(function(d) { return d.endAngle; })
            .innerRadius(function(d) { 
                return Phylowood.zoomScale * Math.sqrt(Phylowood.markerRadius * (1 - d.data.val[Phylowood.curClockTick]));
            })
            .outerRadius(function(d) {
                return Phylowood.zoomScale * Math.sqrt(Phylowood.markerRadius);
            });
    }
    else if (this.pieFillStyle === "outwards")
    {
        this.arc = d3.svg.arc()
            .startAngle(function(d) { return d.startAngle; })
            .endAngle(function(d) { return d.endAngle; })
            .innerRadius(0)
            .outerRadius(function(d) {
                return Phylowood.zoomScale * Math.sqrt(Phylowood.markerRadius * (d.data.val[Phylowood.curClockTick]));
            });
    }


    this.pie = []; 
    this.arcs = [];
    this.paths = [];

    for (var i = 0; i < this.numAreas; i++)
    {
        if (this.animationData[i].length !== 0)
        {
            this.pie[i] = d3.selectAll("#divGeo svg") 
                .append("svg:g")
                .attr("class", "pie" + i);

            // center arcs at foci
            this.arcs[i] = this.pie[i].selectAll("g.arc" + i)
                .data(Phylowood.donut(Phylowood.animationData[i]).filter(function(d) {
                    if (typeof d.data.val[Phylowood.curClockTick] !== "undefined")
                        return d;
                }))
              .enter().append("svg:g")
                .attr("class","arc" + i)
                .attr("transform", function(d) {
                    //console.log(d.data);
                    return "translate(" + d.data.x + "," + d.data.y + ")";
                })
              .append("svg:path")
                .attr("class", "marker")
                .attr("fill", function(d) { return d.data.color; })
                .attr("d", Phylowood.arc)
                .on("mouseover", function(d) {
                    Phylowood.highlightContinuumByMarker(d);
                })
                .on("mouseout", function(d) {
                    Phylowood.unhighlightMarkerByContinuumInfo(d);
                });
        }
    }
   
   /*
   // MJL: add lines to discrete visualization
    // draw lines
    var layer = d3.select("#divGeo svg");
    this.nodelines = layer.selectAll("line.tracer")
        .data(data)
      .enter().append("svg:line")
        .attr("class","tracer")
        .attr("x1", function(d) { return d.x[d.startClockTick]; })
        .attr("y1", function(d) { return d.y[d.startClockTick]; })
        .attr("x2", function(d) { return d.x[d.startClockTick]; })
        .attr("y2", function(d) { return d.y[d.startClockTick]; })
        .attr("stroke", function(d) { return d.color; })
        .style("stroke-width", function() {
            var v = Phylowood.markerRadius * 0.5;
            return Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom) * Math.sqrt(v);
        });
*/

    // rescale discrete pie markers if the map perspective changes
	this.map.on("move", function() {

        Phylowood.zoomPauseAnimation = true;

		// get new map-to-pixel coordinates for all states
        for (var i = 0; i < Phylowood.numAreas; i++)
        {
            if (Phylowood.animationData[i].length !== 0)
            {
                Phylowood.pie[i].selectAll("g").attr("transform", function(d) {
                    if (typeof d !== "undefined") {
                        xy = Phylowood.map.locationPoint(d.data.coord);
                        d.data.x = xy.x;
                        d.data.y = xy.y;
                        //console.log(d);
                        return "translate(" + d.data.x + "," + d.data.y + ")"; 
                    }
                })

                Phylowood.animationData[i].forEach(function(d) {
                    xy = Phylowood.map.locationPoint(d.coord);
                    d.x = xy.x;
                    d.y = xy.y;
                });

                // adjust pie radii for zoom
                Phylowood.zoomScale = Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom);
                Phylowood.pie[i].selectAll(".arc" + i).selectAll("path")
                    .attr("d", Phylowood.arc);
            }
        }
    });
}

Phylowood.drawMap = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// toy data
	var states = this.markers; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [coords.length]; // cluster foci, i.e. areas lat,lons

	// find center and extent of coords
	this.meanLat = 0;
	this.meanLon = 0;
	this.minLat = Infinity;
	this.maxLat = -Infinity;
	this.minLon = Infinity;
	this.maxLon = -Infinity;
    /*
	this.minLat = 90;
	this.maxLat = -90;
	this.minLon = 180;
	this.maxLon = -180;
    */
	for (var i = 0; i < coords.length; i++) {
	
		// latitude
		var lat = coords[i].lat;
		this.meanLat += lat;
		if (lat < this.minLat) { this.minLat = lat; }
		if (lat > this.maxLat) { this.maxLat = lat; }
	
		// longitude
		var lon = coords[i].lon;	
		if (lon < this.minLon) { this.minLon = lon; }
		if (lon > this.maxLon) { this.maxLon = lon; }		

		// convert to 0 to 360
		// if (lon < 0) { lon = 360 + lon; }
		this.meanLon += lon;	
		
	}

	this.meanLat /= coords.length;
	this.meanLon /= coords.length;
	// convert back to -180 to 180
	//if (this.meanLon > 180) {
	//	this.meanLon = this.meanLon - 360
	//}
	
	// create polymaps object
	var po = org.polymaps;
	this.po = po;


    // use url from #SETTINGS block
    var url;
    if (this.mapType === "wordy")
        url = "http://{S}tiles.mapbox.com" + "/v3/mlandis.hgp88mgm" + "/{Z}/{X}/{Y}.png";
        /*
        url = "http://{S}tile.cloudmade.com"
		    + "/5b7ebc9342d84da7b27ca499a238df9d" // http://cloudmade.com/register
		    + "/999/256/{Z}/{X}/{Y}.png"; // dark, streets, fast
            */
    else if (this.mapType === "clean")
        url = "http://{S}tiles.mapbox.com" + "/v3/mlandis.hgp12886" + "/{Z}/{X}/{Y}.png";
        /*
        url = "http://{S}tile.cloudmade.com"
		    + "/5b7ebc9342d84da7b27ca499a238df9d" // http://cloudmade.com/register
		    + "/44979/256/{Z}/{X}/{Y}.png"; // dark, clean, slower
            */
    else if (typeof this.mapType !== "undefined")
        url = this.mapType;



	// create the map object, add it to #divGeo
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
		.center({lat:this.meanLat,lon:this.meanLon})
		.zoom(13)
		.add(po.interact())
		.add(po.image()
		  .url(po.url( url )
/*
          "http://{S}tile.cloudmade.com"
		  + "/5b7ebc9342d84da7b27ca499a238df9d" // http://cloudmade.com/register
		  + "/999/256/{Z}/{X}/{Y}.png") // dark, streets, fast
//		  + "/44979/256/{Z}/{X}/{Y}.png") // dark, blank, slow
*/
		  .hosts(["a.", "b.", "c.", "d."])))
		.add(po.compass().pan("none"));
	this.map = map;
	
	// zoom out to fit all the foci	
	// need to center map at {0,0} when zoom is 1 to put entire globe in view
    console.log("auto-fitting map\n")
    var autoZoomSize = 0.25;
	while (this.minLat < map.extent()[0].lat) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20});break }
	}
	while (this.minLon < map.extent()[0].lon) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20});break }		
	}	
	while (this.maxLat > map.extent()[1].lat) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20});break }		
	}	
	while (this.maxLon > map.extent()[1].lon) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20});break }		
	}
    console.log("autofitting map complete\n")

	this.bestZoom = map.zoom();	
    this.prevZoom = map.zoom();
    this.zoomPauseAnimation = false;
    
    Phylowood.dragPauseAnimation = false;
    $("#divGeo").mousedown(function() {
        Phylowood.dragPauseAnimation = true;
	});
	
	$("#divGeo").mouseup(function() {
        Phylowood.dragPauseAnimation = false;
	});
		
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");

    this.areaDensity = coords.length / ((this.maxLat - this.minLat) * (this.maxLon- this.minLon));
    this.zoomScale = Math.pow(2, Phylowood.map.zoom() - Phylowood.bestZoom);


};

/***
CONTROLS
***/

Phylowood.initPlayer = function() {

	this.ticker = ""; // setInterval() object

	this.playSpeed = 1.0;
    this.playTick = 1.0;
    this.forceRedraw = false;
    this.sliderLock = false;
    this.finalUpdateDisplay = false;
    this.zoomPauseAnimation = false;
    this.dragPauseAnimation = false;
    this.pauseAnimation = true;
	
	$( "#divSlider" ).slider("option", "max", this.numClockTicks)
		.slider("option", "min", 0)
		.slider("option", "value", 0)
		.slider("option", "step",  1)
		.slider({ animate: true });

	this.treeSvg.append("svg:line")
		.data([{"id": -1}])
		.attr("id", "phyloSlider")
		.attr("x1", 0)
		.attr("x2", 0)
		.attr("y1", 0)
		.attr("y2", $( "#divPhylo" ).height())
		.call(d3.behavior.drag()
    		.on("drag", function(d) {
    			Phylowood.drag(d3.event.dx)
    		}) );

    // scales to convert between ticks and pixels for phyloSlider
	this.tickToPxScale = d3.scale.linear()
					.domain([0, this.numClockTicks])
					.range([0, $( "#divPhylo" ).width()]);
					
	this.pxToTickScale = d3.scale.linear()
					.domain([0, $( "#divPhylo" ).width()])
					.range([0, this.numClockTicks]);					

	this.playerLoaded = true;

    this.sliderBusy = false;
    this.animStart();
	
};

// drag time by delta x pixels for the phyloSlider line
Phylowood.drag = function(dx) {
    this.prevClockTick = this.curClockTick; // ??
	this.curClockTick += Phylowood.pxToTickScale(dx); 
    this.curClockTick = Math.round(this.curClockTick);
    if (this.curClockTick >= this.numClockTicks)
        this.curClockTick = this.numClockTicks - 1;
    else if (this.curClockTick < 0)
        this.curClockTick = 0;
    //this.updateSlider();
    this.updateDisplay();
}

Phylowood.animStartClick = function() {
    this.finalUpdateDisplay = true;
    this.animStart();
}

Phylowood.animEndClick = function() {
    this.finalUpdateDisplay = true;
    this.animEnd();
}

Phylowood.animStart = function() {

    this.playTick = 1.0;
	this.playSpeed = 1.0;
    this.animPause();
	
    this.prevClockTick = this.curClockTick;
	this.curClockTick = 0;
    if (this.finalUpdateDisplay === true) //false)
    {
        this.finalUpdateDisplay = false; //true;
        this.updateDisplay();
    }
    //this.finalUpdateDisplay = false;

    $( "#play" ).button("option", { label: "play", icons: { primary: "ui-icon-play" }});
    clearInterval(Phylowood.ticker);

}

Phylowood.animEnd = function() {

    this.playTick = 1.0;
	this.playSpeed = 1.0;
    this.animPause();
	
    this.prevClockTick = this.curClockTick;
	this.curClockTick = this.numClockTicks - 1;
    if (this.finalUpdateDisplay === true) //false)
    {
        this.finalUpdateDisplay = false;//true;
        this.updateDisplay();
    }
    //this.finalUpdateDisplay = false;

    $( "#play" ).button("option", { label: "play", icons: { primary: "ui-icon-play" }});
    clearInterval(Phylowood.ticker);
}

Phylowood.animRewind = function() {

	if (this.playTick === 1.0 && this.playSpeed === 1.0)
		this.playTick = -1.0;
    if (this.playTick === 1.0 && this.playSpeed > 1.0)
		this.playSpeed /= 2.0;
	else if (this.playTick === -1.0 && this.playSpeed >= 1.0 && this.playSpeed <= 8.0)
		this.playSpeed *= 2.0;

    // reset interval
    clearInterval(Phylowood.ticker);
	if (this.pauseAnimation === false)
        Phylowood.ticker = setInterval(this.updateDisplay, this.clockTick / this.playSpeed); 
}

Phylowood.animFfwd = function() {

	if (this.playTick === -1.0 && this.playSpeed === 1.0)
		this.playTick = 1.0;
    if (this.playTick === -1.0 && this.playSpeed > 1.0)
		this.playSpeed /= 2.0;
	else if (this.playTick === 1.0 && this.playSpeed >= 1.0 && this.playSpeed <= 8.0)
		this.playSpeed *= 2.0;

    // reset interval
    clearInterval(Phylowood.ticker);
	if (this.pauseAnimation === false)
        Phylowood.ticker = setInterval(this.updateDisplay, this.clockTick / this.playSpeed); 
}

Phylowood.animPause = function() {
    this.pauseAnimation = true;
	clearInterval(Phylowood.ticker);
}

Phylowood.animPlay = function() {

    this.pauseAnimation = false;
    if (this.playerLoaded === true) {
		Phylowood.ticker = setInterval(this.updateDisplay, this.clockTick / this.playSpeed); 
	}
}

Phylowood.animStop = function() {
	clearInterval(Phylowood.ticker);
	this.playSpeed = 1.0;
    this.playTick = 1.0;
	this.animStart();
}

Phylowood.slideSlider = function() {

    Phylowood.changeSlider(); 
	this.sliderBusy = true;
}

Phylowood.changeSlider = function() {

	if (typeof Phylowood.sliderBusy !== "undefined" && Phylowood.sliderLock === false) {
        Phylowood.prevClockTick = Phylowood.curClockTick;
		Phylowood.curClockTick = $( "#divSlider" ).slider("option","value");
        if (Phylowood.curClockTick === Phylowood.numClockTicks)
        {
            Phylowood.curClockTick -= 1;
            Phylowood.finalUpdateDisplay = true;
        }
        else if (Phylowood.curClockTick === -1)
        {
            Phylowood.curClockTick = 0;
            Phylowood.finalUpdateDisplay = true;
        }

        if (this.sliderBusy === true || this.pauseAnimation === true)
	        this.updateDisplay();
	}
    Phylowood.sliderBusy = false;
}

Phylowood.updateSlider = function() {

    Phylowood.sliderLock = true;
    var pos = Phylowood.tickToPxScale(Phylowood.curClockTick);
    $( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
    $( "#divSlider" ).slider("option","value", Phylowood.curClockTick);
    Phylowood.curPhyloTimeText.text(function() {
        var t = Phylowood.curClockTick * Phylowood.phyloTick + Phylowood.phyloTimeOffset - Phylowood.root.len;
        return t.toFixed(2) + " " + Phylowood.phyloTimeUnit;
    });
    //console.log("updateSlider() " + Phylowood.curClockTick);
    Phylowood.sliderLock = false;
}

Phylowood.updateDisplay = function() {

	// update slider position
    Phylowood.updateMarkers();

    if (Phylowood.finalUpdateDisplay === true)
    {
        if (Phylowood.curClockTick >= Phylowood.numClockTicks - 1)
        {
            Phylowood.animEnd();
        }
        else if (Phylowood.curClockTick <= 0)
        {
            Phylowood.animStart();
        }
    }
    Phylowood.updateSlider();
}

Phylowood.updateMarkers = function() {

    if (this.areaType === "discrete")
    {
        for (var i = 0; i < this.numAreas; i++)
        {
            if (Phylowood.animationData[i].length !== 0)
            {
                this.arcs[i] = this.pie[i].selectAll(".arc" + i);
            }
        }
      
        // MJL 140312: not sure this actually does anything...
        // force a redraw if curClockTick has passed over a divergence event
        if (Phylowood.curClockTick !== Phylowood.prevClockTick + Phylowood.playTick)
        {
            var curIdx = 0,
                prevIdx = 0;

            for (var i = 0; i < Phylowood.divergenceTicks.length; i++)
            {
                if (Phylowood.curClockTick > Phylowood.divergenceTicks[i])
                    curIdx = i;
                if (Phylowood.prevClockTick > Phylowood.divergenceTicks[i])
                    prevIdx = i;
            }

            if (curIdx !== prevIdx) {
                Phylowood.forceRedraw = true;
            }
        }

        if (Phylowood.prevZoom === Phylowood.map.zoom() && Phylowood.zoomPauseAnimation === false)
        {
            // cladogenesis (add / remove pie slices)
            if ($.inArray(Phylowood.curClockTick, Phylowood.divergenceTicks) !== -1 
                || Phylowood.forceRedraw === true)
            {
                // corrects for the fact that lineages exist from t=[0,k-1] 
                if (Phylowood.playTick < 0.0 && Phylowood.curClockTick !== 0)
                    Phylowood.curClockTick = Phylowood.curClockTick - 1;

                for (var i = 0; i < this.numAreas; i++)
                {
                    if (this.animationData[i].length !== 0)
                    {
                        // remove old pie 
                        this.arcs[i].remove();

                        // add new pie
                        this.arcs[i] = this.pie[i].selectAll(".arc" + i)
                            .data(Phylowood.donut(Phylowood.animationData[i]).filter(function(d) {
                                if (typeof d.data.val[Phylowood.curClockTick] !== "undefined"
                                    && d.data.maskContinuum === false)
                                        return d;
                            }))
                          .enter().append("svg:g")
                            .attr("class","arc" + i)
                            .attr("transform", function(d) {
                                return "translate(" + d.data.x + "," + d.data.y + ")";
                            })
                          .append("svg:path")
                            .attr("class", "marker")
                            .attr("fill", function(d) { return d.data.color; })
                            .attr("visibility", function(d) {
                                if (d.data.highlightContinuum === true)
                                    return "visible";
                                else
                                    return "hidden";
                            })
                            .attr("d", Phylowood.arc)
                            .on("mouseover", function(d) {
                                Phylowood.highlightContinuumByMarker(d);
                            })
                            .on("mouseout", function(d) {
                                Phylowood.unhighlightMarkerByContinuumInfo(d);
                            });
                    }
                }

                if (Phylowood.playTick < 0.0 && Phylowood.curClockTick !== 0)
                    Phylowood.curClockTick = Phylowood.curClockTick + 1;
            }

            // anagenesis (animate pie depths)
            else
            {
                for (var i = 0; i < this.numAreas; i++)
                {
                    if (this.animationData[i].length !== 0)
                    { 
                        this.arcs[i].selectAll("path").select(function(d) {
                            if (d.data.val[Phylowood.curClockTick]
                                !== d.data.val[Phylowood.curClockTick - Phylowood.playTick])
                                return this;
                            else
                                return null;
                        }).attr("d", Phylowood.arc);
                    }
                }
            }
            Phylowood.prevClockTick = Phylowood.curClockTick;
        }
        else {
            Phylowood.prevZoom = Phylowood.map.zoom();
        }

        // should the animation be paused?
        if (Phylowood.dragPauseAnimation === false
            && Phylowood.zoomPauseAnimation === false
            && Phylowood.forceRedraw === false
            && Phylowood.sliderBusy === false
            && Phylowood.pauseAnimation === false
            && Phylowood.finalUpdateDisplay === false)
        {
            //Phylowood.prevClockTick = Phylowood.curClockTick;
            Phylowood.curClockTick += Phylowood.playTick;
        }
        else if (Phylowood.forceRedraw === true)
        {
        //    Phylowood.prevClockTick = Phylowood.curClockTick - Phylowood.playTick;
            Phylowood.forceRedraw = false;
        }
   
        if (Phylowood.zoomPauseAnimation === true)
            Phylowood.zoomPauseAnimation = false;
        /*
        else if (Phylowood.dragPauseAnimation === true
            || Phylowood.zoomPauseAnimation === true)
        {
            d3.selectAll("path").transition(0);
        }*/

        // stop at boundaries
        if (Phylowood.curClockTick >= Phylowood.numClockTicks - 1 && Phylowood.curClockTick !== Phylowood.prevClockTick)
        {
            Phylowood.finalUpdateDisplay = true;    
        }
        else if (Phylowood.curClockTick <= 0 && Phylowood.prevClockTick !== Phylowood.curClockTick)
        {
            Phylowood.finalUpdateDisplay = true;    
        }

        Phylowood.sliderBusy = false;
    }

    else if (this.modelType === "phylogeography" && this.areaType === "continuous")
    {
        if (Phylowood.prevZoom === Phylowood.map.zoom() && Phylowood.zoomPauseAnimation === false)
        {  

            // inactive lineages
            d3.selectAll("svg circle")
                .select(function(d)
                {
                    if (d.startClockTick > Phylowood.curClockTick || d.endClockTick <= Phylowood.curClockTick)
                        return this;
                    else
                        return null;
                })
                .attr("visibility", "hidden") 
                .attr("cx", function(d) { 
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.x[d.startClockTick];
                    else if (d.endClockTick <= Phylowood.curClockTick)
                        return d.x[d.endClockTick];
                })
                .attr("cy", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.y[d.startClockTick];
                    else if (d.endClockTick <= Phylowood.curClockTick)
                        return d.y[d.endClockTick];
                });

            // active lineages
            d3.selectAll("svg circle")
                .select(function(d)
                {
                    if (d.startClockTick <= Phylowood.curClockTick && d.endClockTick > Phylowood.curClockTick)
                        return this;
                    else
                        return null;
                })
              .transition()
                .ease("linear")
                .duration(function(d) { 
                    // makes animations looth smoother when using slider
                    if (Phylowood.sliderBusy === true)
                        return 5;
                    // otherwise, animate per clockTick of playSpeed
                    else
                        return Phylowood.clockTick / Phylowood.playSpeed;
                })
                .attr("visibility", function(d) {
                    if (d.maskContinuum === true)
                        return "hidden";
                    else
                        return "visible";
                })
                .attr("cx", function(d) { return d.x[Phylowood.curClockTick]; })
                .attr("cy", function(d) { return d.y[Phylowood.curClockTick]; });

            Phylowood.nodelines
              .transition()
                .ease("linear")
                .duration(function(d) { 
                    // makes animations looth smoother when using slider
                    if (Phylowood.sliderBusy === true)
                        return 5;
                    // otherwise, animate per clockTick of playSpeed
                    else
                        return Phylowood.clockTick / Phylowood.playSpeed;
                })
                .attr("x2", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.x[d.startClockTick];
                    else if (d.endClockTick < Phylowood.curClockTick)
                        return d.x[d.endClockTick];
                    else
                        return d.x[Phylowood.curClockTick];
                })
                .attr("y2", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.y[d.startClockTick];
                    else if (d.endClockTick < Phylowood.curClockTick)
                        return d.y[d.endClockTick];
                    else
                        return d.y[Phylowood.curClockTick];
                });

            //Phylowood.zoomPauseAnimation = false;
        }
        else {
            Phylowood.prevZoom = Phylowood.map.zoom();
            //Phylowood.zoomPauseAnimation = true;
        }

        // should the animation be paused?
        if (Phylowood.dragPauseAnimation === false
            && Phylowood.zoomPauseAnimation === false
            && Phylowood.sliderBusy === false
            && Phylowood.pauseAnimation === false
            && Phylowood.finalUpdateDisplay === false)
        {
            Phylowood.curClockTick += Phylowood.playTick;
        }
        else if (Phylowood.dragPauseAnimation === true
            || Phylowood.zoomPauseAnimation === true)
        {
            d3.selectAll("svg circle").transition(0);
        }
        if (Phylowood.zoomPauseAnimation === true)
            Phylowood.zoomPauseAnimation = false;

        // stop at boundaries
        if (Phylowood.curClockTick >= Phylowood.numClockTicks - 1 && Phylowood.curClockTick !== Phylowood.prevClockTick)
        {
            Phylowood.finalUpdateDisplay = true;    
        }
        else if (Phylowood.curClockTick <= 0 && Phylowood.prevClockTick !== Phylowood.curClockTick)
        {
            Phylowood.finalUpdateDisplay = true;    
        }
        /*
        if (Phylowood.curClockTick >= Phylowood.numClockTicks - 1)
        {
            Phylowood.finalUpdateDisplay = true;
        }
        else if (Phylowood.curClockTick < 0)
        {
            Phylowood.finalUpdateDisplay = true;
        }*/
    }
}

/***
INFO BOX
***/

Phylowood.initFilter = function() {

    this.svgFilter = d3.selectAll("#divFilter").append("svg");
    
}

/***
UTILITY FUNCTIONS
***/

Phylowood.distance = function(x, y) {
	var z = 0.0;
	if (this.distanceType === "Euclidean") {
		// fast and easy
		z += (x.lat - y.lat)^2;
		z += (x.lon - y.lon)^2;
		z = z^0.5;
	}
	else if (this.distanceType === "haversine") {
		// implement if needed
		;
	}
	else {
		alert("Phylowood.distance(): unknown distance \"" + this.distanceType + "\"");
		z = -1.0;
	}
	return z;
};

Phylowood.rnorm = function(mu, sigma) {
    var u = Math.random();
    var v = Math.random();
    var sqrt_u = Math.sqrt(-2 * Math.log(u));
    return {
        "x": sqrt_u * Math.cos(2 * Math.PI * v),
        "y": sqrt_u * Math.sin(2 * Math.PI * v)
    };
}

function trim1 (str)
{
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

/***
TESTING
***/

Phylowood.testOpenLayers = function() {
	this.olmap = new OpenLayers.Map("divGeo", {
		size: new OpenLayers.Size( { w:200, h:200 } ),
		controls: [
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.ArgParser(),
			new OpenLayers.Control.Attribution()
		]
	});
	
	var numControl = this.olmap.controls.length;
	for (var i = 0; i < numControl; i++) {
		this.olmap.controls[0].deactivate();
		this.olmap.removeControl(this.olmap.controls[0]);
	}
	
	this.olwms = new OpenLayers.Layer.WMS( "OpenLayers WMS", 
                                            "http://labs.metacarta.com/wms/vmap0?", 
                                            {'layers': 'basic'},
                                            {'minExtent': new OpenLayers.Bounds(-1,-1,1,1),
                                             'maxExtent': new OpenLayers.Bounds(-122.2,38.0,-122.1,38.2),
                                             //'maxExtent': new OpenLayers.Bounds(-100,-100,100,100),
                                             'minResolution': "auto",
                                             'maxResolution': "auto"});

    this.olmap.addLayer(this.olwms);
    var div = OpenLayers.Util.getElement("divGeo");
    div.style.width = 600 + "px";
    div.style.height = 600 + "px";
    /*
	var exportMapControl = new OpenLayers.Control.ExportMap();
	this.olmap.addControl(exportMapControl);
	this.olmap.addControl(new OpenLayers.Control.LayerSwitcher());
	this.olmap.zoomToExtent(new OpenLayers.Bounds(-11.8296875, 39.54021484375, 10.6703125, 50.79021484375));
	var olmapCanvas = OpenLayers.Util.getElement("exportedImage");
	exportMapControl.trigger(olmapCanvas);
	OpenLayers.Util.getElement("downloadLink").href = canvas.toDataURL();
	*/

	// render the map at defined zoom
	this.olmap.zoomToMaxExtent();
};

Phylowood.testPolyMaps = function() {

	// reformat Phylowood data into this JSON-like format
	// expects input as ...
	var d1 = 
		[
			{"id": "A", "val": 1.0, "coords": [-121.08, 38.17], "color": "red"},
			{"id": "A", "val": 1.0, "coords": [-121.18, 38.05], "color": "red"},
			{"id": "A", "val": 1.0, "coords": [-121.13, 38.11], "color": "red"},
			{"id": "B", "val": 1.0, "coords": [-122.08, 38.17], "color": "yellow"},
			{"id": "B", "val": 1.0, "coords": [-122.18, 38.05], "color": "yellow"},
			{"id": "B", "val": 1.0, "coords": [-122.13, 38.11], "color": "yellow"},
			{"id": "C", "val": 1.0, "coords": [-123.08, 38.17], "color": "blue"},
			{"id": "C", "val": 1.0, "coords": [-123.18, 38.05], "color": "blue"},
			{"id": "C", "val": 1.0, "coords": [-123.13, 38.11], "color": "blue"}
		];

	// create polymaps object
	var po = org.polymaps;
	
	// Create the map object, add it to #map…
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
		.center({lat: 38.1, lon: -122.15})
		.zoom(8)
		//.centerRange([{lat: 38.2, lon: -122.1}, {lat: 38.0, lon: -122.2}])
		.add(po.interact());
		
	map.add(po.image()
		.url(po.url("http://{S}tile.cloudmade.com"
		+ "/87d72d27ad3a48939015cdbd06980326" // http://cloudmade.com/register
		+ "/2/256/{Z}/{X}/{Y}.png")
        /*
		.url(po.url("http://{S}.tiles.mapbox.com"
		//+ "/87d72d27ad3a48939015cdbd06980326" // http://cloudmade.com/register
        + "/v3/mlandis.hgp12886"
		+ "/{Z}/{X}/{Y}.png")
        */
		.hosts(["a.", "b.", "c.", ""])));
		
	map.add(po.compass()
		.pan("none"));
    
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	
	function transform(d) {
    	d = map.locationPoint({lon: d.coords[0], lat: d.coords[1]});
		return "translate(" + d.x + "," + d.y + ")";
	}
	
	// update marker positions when map moves
	map.on("move", function() {
		layer.selectAll("g").attr("transform", transform);
    });
    
	var marker = layer.selectAll("g")
		.data(d1)
		.enter()
		.append("svg:g")
		.attr("transform", transform);
	
	// add a circle
	marker.append("svg:circle")
		.attr("r", function(d) { return d.val * 5.0; })
		.style("fill", function(d){ return d.color; });
	
};

Phylowood.testMultiFocus = function () {
	this.initMap();
};

Phylowood.testSelect = function() {
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	layer.selectAll("circle.node")
		.select(function(d,i) { return i > 3 ? d : null; });// { return d.id > 3 ? this : null; })
		//.remove();
};

/***
GRAVEYARD OF SPOOKY CODE
***/
Phylowood.initMarkersForce = function() {
	this.markers = [];
//	var showStart = 20;
//	var showOnly = 20;
	var showStart = 0;
	var showOnly = this.numNodes;

	this.showThreshhold = 0.01;
		
    // for each divergence event
	for (var i = showStart; i < showOnly + showStart; i++) {
		var id = this.nodes[i].id;
		var c = this.nodes[i].color;
		var timeStart = this.nodes[i].timeStart;
		var timeEnd = this.nodes[i].timeEnd;
        var ancestor = this.nodes[i].ancestor;

        // for each area
		for (var j = 0; j < this.nodes[i].states.length; j++) {

            // for each lineage
			if (this.nodes[i].states[j] > this.showThreshhold) {
				this.markers.push({
					"id": id,
                    "ancestor": ancestor,
					"area": j,
					"val": this.nodes[i].states[j],
					"active": false,
					"timeStart": timeStart,
					"timeEnd": timeEnd,
					"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
					"scheduleErase": false,
					"scheduleDraw": false,
					"maskContinuum": false
				});
			}
		}
	}
};

Phylowood.drawMarkersPie = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;
		
	// assign foci xy coordinates from geographical coordinates
	var foci = []; // cluster foci, i.e. areas lat,lons
	for (var i = 0; i < Phylowood.geoCoords.length; i++)
		foci[i] = Phylowood.map.locationPoint(Phylowood.geoCoords[i]);	

	// draw each pie
	function bakepie(classname, data, x, y, r)
	{
		var arc = d3.svg.arc()
		    .startAngle(function(d) { return d.startAngle; } )
	        .endAngle(function(d) { return d.endAngle; } )
	        .innerRadius(function(d,i) { 
			    if (data.val[i] === 0.0) return r;
			    else return Math.pow(1.0 - data.val[i], 2) * r; 
		    })
	        .outerRadius(r);

		var pie = d3.select("#divGeo svg")
            .append("svg:g")
                .data([data.val.map(Math.ceil)]) // works 
                // need to use the d3.fn() that reindexes data
                // if I use .sort(), then .data is indexed differently
                /*
                .data([data.ancestor.sort(function(a,b) {
            		z = 0;
					if (a.ancestor === b.ancestor) z++;
				//	if (a.ancestor === b.id) z++;
					return z;
                })].map(function(d,i){
					return Math.ceil(data.val[i]);
                }))*/
                .attr("class", classname);

		var donut = d3.layout.pie();

		var arcs = pie.selectAll("g.arc")
            .data(donut)
          .enter().append("svg:g")
            .attr("class", "arc")
            .attr("transform", "translate(" + x + "," + y + ")");

        var paths = arcs.append("svg:path")
            .attr("fill", function(d, i) { return data.color[i]; })
            .attr("d", arc)
            .attr("class", "marker")
		    //.attr("d", function() { return  arc; });

   		Phylowood.donut = donut;
		Phylowood.arc = arc;
		Phylowood.pie = pie;
		Phylowood.arcs = arcs;
		Phylowood.paths = paths;
    }
	
	var numPies = Phylowood.markers[0].length;
	//var numTimes = Phylowood.markers.length;
    var numTimes = 3;
	var t = 2;
	for (; t < numTimes; t++)
	{
	    for (i = 0; i < numPies; i++)
	    {
            bakepie("pie" + i, Phylowood.markers[t][i], foci[i].x, foci[i].y, 5);
    	}
	}
    
    // update coordinates when map pans and zooms
	this.map.on("move", function() {

		var na = Phylowood.numAreas;
		var p = d3.selectAll("#divGeo svg path")[0];

		// update force foci positions
		for (var i = 0; i < Phylowood.numAreas; i++) {
			foci[i] = Phylowood.map.locationPoint(Phylowood.geoCoords[i]);
			
			for (var j = 0; j < Phylowood.numNodes; j++) {
				p[i * na + j].attr("transform", "translate(" + foci[i].x + "," + foci[i].y + ")");
			}
		}

		
		// attempted to assign each path its corresponding area
		// 	this could be used to translate the path to a new location

		// also, need to rescale the innerradius/outerradius w/r/t map.zoom()
		// 	I think this may require redrawing the paths, since the paths
		// 	are relatively complicated strings...

/*
		d3.selectAll("#divGeo svg path")
			.attr("transform", function(d,i) {
				console.log(d.area);
				//return "translate(" + foci[d.area].x + "," + foci[d.area].y + ")";
				return "translate(" + foci[d.area].x + "," + foci[d.area].y + ")";
			});
*/
	});	    
};

	
Phylowood.drawMarkersPack = function() {
	
	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;
		
	// assign foci xy coordinates from geographical coordinates
	var foci = []; // cluster foci, i.e. areas lat,lons
	for (var i = 0; i < Phylowood.geoCoords.length; i++)
		foci[i] = Phylowood.map.locationPoint(Phylowood.geoCoords[i]);	
	
	var t = 0;
	var numPacks = Phylowood.markers[0].length;
	for (i = 0; i < numPacks; i++)
	{
		var data = Phylowood.markers[t][i];
		var r = data.val.join("+"); // 
    	makePack("pack" + i, data, foci[i].x, foci[i].y, data.val.join("+") * 20);
    }	
};

Phylowood.drawMarkersForce = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// geo data
	var states = this.markers; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [coords.length]; // cluster foci, i.e. areas lat,lons
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
		foci[i] = this.map.locationPoint(coords[i]);	

	// create force layout
	this.force = d3.layout.force()
		.nodes(states)
		.links([])
	//	.charge( function(d) { return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 3, 2.0) / 8; } )
		.charge( function(d) {
            return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 4, 2.2);
        })
		.gravity(0.0)
		.theta(1.5)
		.friction(0.9)
		//.alpha(100000)
		.size([w, h])
		;
		
	states.forEach(function(d, i) {
		d.x = foci[d.area].x;
		d.y = foci[d.area].y;
	});

	this.force.start();
	
	// create svg markers
	var layer = d3.select("#divGeo svg")
	var node = layer.selectAll("circle.marker")
			.data(states)
		.enter().append("svg:circle")
			.attr("class","marker")
			.attr("cx", function(d) { return foci[d.area].x; })
			.attr("cy", function(d) { return foci[d.area].y; })
			.attr("r",  function(d) {
                return Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
            })
			.attr("fill", function(d) { return d.color; })
			.attr("stroke-width", 1)
			.attr("fill-opacity", 1)
			.attr("visibility","hidden")
			;

	// freeze markers during pan & zoom
	d3.select("#divGeo")
		.on("mousedown", mousedown)
		.on("mouseup", mouseup);
		
	function mousedown() {
		Phylowood.force.stop();
	}
	
	function mouseup() {
		// disabled to suppress d3.layout.pack "boioioing"-iness
		//force.resume();
	}

	// update coordinates when map pans and zooms
	this.map.on("move", function() {

		// update force properties with each move
        // Phylowood.force.charge( function(d) { return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 4, 2.2); } )

        // better visualization: have all nodes retain actual positions, instead of refocusing
		// it seems like areas contract at different zoom levels... weird
		// update positions of js states[] objects
		Phylowood.force.stop();
	
		// get new map-to-pixel coordinates for all states
        states.forEach(function(o,i) {
			xy = Phylowood.map.locationPoint({"lon": o.lon, "lat":o.lat});
			o.x = xy.x;
			o.y = xy.y; 
		});
		
		// update positions and radii for nodes
		node.attr("cx", function(d) { return d.x; })
		    .attr("cy", function(d) { return d.y; })
		    .attr("r", function(d) {
                return  Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
            });


		// update force foci positions
		for (var i = 0; i < coords.length; i++)
			foci[i] = Phylowood.map.locationPoint(coords[i]);
		
	    // force.resume();

	});	


	// update node[] each tick
	this.force.on("tick", function(e) {

		// set stepsize per tick
		var k = e.alpha * 5;

		// update object values per tick
		states.forEach(function(o,i) {
			o.x += (foci[o.area].x - o.x) * k
			o.y += (foci[o.area].y - o.y) * k
			var latlon = Phylowood.map.pointLocation({"x": o.x, "y": o.y});
			o.lon = latlon.lon;
			o.lat = latlon.lat;
		});

		// update object attributes per tick
		layer.selectAll(".marker")
		     .attr("cx", function(d) { return d.x; })
		     .attr("cy", function(d) { return d.y; });
		
	});
	
}
