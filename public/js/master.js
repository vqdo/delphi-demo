/**
 * Integrate D3.js with available Delphi tables. 
 * 
 * author: Victoria Do
 * May 2015
 */

var DelphiDemo = DelphiDemo || (function() {
  var self = {};

  self.cache = {};
  var graphAttr = {
    created: false,
    upperLimit: 0,

    datasets: []
  };

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
  self.render = function() {

  };

  var createGraph = function(data) {
    // divisor for calculating percentages
    var sum = data.reduce(function(acc, d) { return acc + d.value; }, 0) / 100;

    var margin = {top: 40, right: 50, bottom: 30, left: 80},
    width = $(window).width() - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

    var formatPercent = d3.format("f");

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(formatPercent);

    graphAttr.tip = d3.tip()
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

    svg.call(graphAttr.tip);

    graphAttr.upperLimit = Math.max(graphAttr.upperLimit, d3.max(data, function(d) { return d.value/sum }));

    x.domain(data.map(function(d) { return d.name; }));
    y.domain([0, graphAttr.upperLimit ]);
    console.log(y);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency In Population (%)");

    graphAttr.x = x;
    graphAttr.y = y;   
    graphAttr.svg = svg;     
    graphAttr.height = height;
    graphAttr.width  = width;     

    addDataSet(data, "base");
    graphAttr.created = true;
  };

  var updateDataSet = function(data, id) {
    if(!graphAttr.datasets.id) {
      return addDataSet(data, id);
    }

    var sum = data.reduce(function(acc, d) { return acc + d.value; }, 0) / 100;
    graphAttr.upperLimit = Math.max(graphAttr.upperLimit, d3.max(data, function(d) { return d.value/sum }));    

    graphAttr.y.domain([0, graphAttr.upperLimit]);

    graphAttr.svg.select('body').transition();

    graphAttr.svg.select(".bar-" + id)
        .data(data, function(d) {return d.name})
        .transition(750);        
  }

  var addDataSet = function(data, id) {
    console.log("Adding data");
    console.log(data);
    var sum = data.reduce(function(acc, d) { return acc + d.value; }, 0) / 100;
    graphAttr.upperLimit = Math.max(graphAttr.upperLimit, d3.max(data, function(d) { return d.value/sum }));    

    graphAttr.y.domain([0, graphAttr.upperLimit]);

    var bar = graphAttr.svg.selectAll(".bar-" + id)
        .data(data, function(d) {return d.name});

    bar.enter().append("rect")    
        .attr("class", "bar-" + id)
        .attr("width", graphAttr.x.rangeBand())        
        .on('mouseover', graphAttr.tip.show)
        .on('mouseout', graphAttr.tip.hide)

    bar
        .attr("x", function(d) { return graphAttr.x(d.name); })
        .attr("y", function(d) { return graphAttr.y(d.value/sum); })
        .attr("height", function(d) { return graphAttr.height - graphAttr.y(d.value/sum); });  
  }


  self.getCausesOfDeath = function(zip) {
    console.log("Getting data");
    $.get("/api/causes_of_death", zip && {zipcode: zip}, function(data) {
        var points = transformData(data);

        if(!graphAttr.created) {
          createGraph(points);
        } else {
          updateDataSet(points, "compare");
        }
        self.cache[zip || "all"] = points;
      }
    );
  };

  self.init = function() {
    self.getCausesOfDeath();
  };


  return self;
})();

$(document).ready(function() {
  DelphiDemo.init();

  $('#custom-zip').submit(function(evt) {
    var value = $(evt.target).find('.target').val();
    if(!isNaN(parseFloat(value)) && isFinite(value)) {
      DelphiDemo.getCausesOfDeath(value);
    }
    evt.preventDefault();
  });
});