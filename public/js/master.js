/**
 * Integrate D3.js with available Delphi tables. 
 * 
 * author: Victoria Do
 * May 2015
 */

var DelphiDemo = DelphiDemo || (function() {
  var self = {};

  self.cache = {};
  var graph = {
    created: false,
    upperLimit: 0,

    datasets: []
  };

  // 
  var deathDecoder = { 
    "htd": "Heart Disease",
    "can": "Malignant Neoplasms (Cancer)", 
    "stk": "Cerebrovascular Disease (Stroke)",
    "cld": "Chronic Lower Respiratory Disease",
    "inj": "Unintentional Injuries",
    "pnf": "Pneumonia/Influenza",
    "dia": "Diabetes",
    "alz": "Alzheimer's Disease",
    "liv": "Chronic Liver Disease and Cirrhosis",
    "sui": "Intentional Self Harm (Suicide)",
    "hom": "Homicide",
    "oth": "Other",
    "unk": "Unknown"
  };

  /**
   * Default handlers for zip code form 
   */
  self.onBadInput = function(input) {
    $('.message').html("No results for <strong>" + input + "</strong>");
  }
  self.onGoodInput = function(input) {
    if(input) {
      $('.current-zip').html("Viewing " + input);
      $('.message').html('');
    }
  }

  /** 
   * Turn data into something more agreeable to D3 
   */
  var transformData = function(data) {
    var points = [];
    // divisor for calculating percentages
    var sum = 0;
    $.each(data, function(x,y) { sum += +y; });
    sum /= 100;

    $.each(data, function(x, y) {
      points.push({name: x, value: +y, pc: Math.round(+y/sum)});
    });

    return points;
  };

  /**
   * Create graph for the first time
   */
  var createGraph = function(data) {
    if(graph.created) return;

    // divisor for calculating percentages
    var sum = data.reduce(function(acc, d) { return acc + d.value; }, 0) / 100;

    var margin = {top: 40, right: 50, bottom: 30, left: 80},
    width = $(window).width() - margin.left - margin.right,
    height = Math.max(300, Math.min($(window).height(), 500)) - margin.top - margin.bottom;


    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    graph.xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var formatPercent = d3.format("f");
    graph.yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(formatPercent);

    graph.tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        var name = deathDecoder[d.name] || d.name;
        return "<strong>" + name + "</strong> <span style='color:red'>" + d.value + " (" + d.pc + "%)</span>";
      })

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(graph.tip);

    graph.upperLimit = Math.max(graph.upperLimit, d3.max(data, function(d) { return d.value/sum }) + 5);

    x.domain(data.map(function(d) { return d.name; }));
    y.domain([0, graph.upperLimit ]);
    console.log(y);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(graph.xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(graph.yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency In Population (%)");

    graph.x = x;
    graph.y = y;   
    graph.svg = svg;     
    graph.height = height;
    graph.width  = width;     

    addDataSet(data, "base");
    graph.created = true;
  };

  /**
   * Update the "compare" data set */
  var updateDataSet = function(data, id) {
    if(!graph.datasets.id) {
      return addDataSet(data, id);
    }

    var sum = data.reduce(function(acc, d) { return acc + d.value; }, 0) / 100;
    graph.upperLimit = Math.max(graph.upperLimit, d3.max(data, function(d) { return d.value/sum }));    

    graph.y.domain([0, graph.upperLimit]);

    graph.svg.select('body').transition();

    graph.svg.select(".bar-" + id)
        .data(data, function(d) {return d.name})
        .transition(750);        
  }

  /** 
   * Add a data set with the passed in id 
   */
  var addDataSet = function(data, id) {
    console.log("Adding data");
    console.log(data);
    var sum = data.reduce(function(acc, d) { return acc + d.value; }, 0) / 100;
    graph.upperLimit = Math.max(graph.upperLimit, d3.max(data, function(d) { return d.value/sum }));    

    graph.y.domain([0, graph.upperLimit]);

    var bar = graph.svg.selectAll(".bar-" + id)
        .data(data, function(d) {return d.name});

    bar.enter().append("rect")    
        .attr("class", "bar-" + id)
        .attr("width", graph.x.rangeBand())        
        .on('mouseover', graph.tip.show)
        .on('mouseout', graph.tip.hide)

    bar
        .attr("x", function(d) { return graph.x(d.name); })
        .attr("y", function(d) { return graph.y(d.value/sum); })
        .attr("height", function(d) { return graph.height - graph.y(d.value/sum); });  
  }

    /** 
     * Check that the result from the server is non-empty 
     */
    var verifyData = function(data, param) {
      // If values are null, this means the server did not return any results
      if(data && data.can !== null) {
        self.onGoodInput(param);
        return true;
      }

      self.onBadInput(param);      
      return false;
    }

  /** 
   * Send an ajax request to the server with the provided zip code.
   * Update the graph with this data, if good.
   */ 
  self.getCausesOfDeath = function(zip) {
    console.log("Getting data");
    $.get("/api/causes_of_death", zip && {zipcode: zip}, function(data) {
        if(!verifyData(data, zip)) return;

        var points = transformData(data);

        if(!graph.created) {
          createGraph(points);
        } else {
          updateDataSet(points, "compare");
        }

        self.cache[zip || "all"] = points;
      }
    );
  };

  /** 
   * initialize 
   */
  self.init = function() {
    self.getCausesOfDeath();
  };

  return self;
})();

$(document).ready(function() {
  DelphiDemo.init();

  // Event handler for zip code input box
  $('#custom-zip').submit(function(evt) {
    var value = $(evt.target).find('.target').val();
    if(!isNaN(parseFloat(value)) && isFinite(value)) {
      DelphiDemo.getCausesOfDeath(value);
    }
    evt.preventDefault();
  });
});