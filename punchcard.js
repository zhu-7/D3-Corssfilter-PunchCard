var svnLogFile = 'test.csv';

var margin = {top: 20, right: 30, bottom: 30, left: 20}
var width = 960 - margin.left - margin.right
var height = 405 - margin.top - margin.bottom

var days = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
];
var hours = [
  "12am", "1am", "2am", "3am", "4am", "5am", "6am", "7am", "8am",
  "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm",
  "6pm", "7pm", "8pm", "9pm", "10pm", "11pm"
];
	
var chart = d3.select('#punch_card').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

var dayGroup = chart.append("g");
var hourGroup = chart.append("g");
var circleGroup = chart.append("g");

//add tooltips to the circleGroup
var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) {
		return "<strong>Commits:</strong> <span style='color:red'>"  +d.value+ "</span>";
	});
circleGroup.call(tip);

//Axis 	
x = {
      min:  0,
      max:  width
    }
x.step = x.max/24;

y = {
      min:  0,
      max:  height
    }
y.step = y.max/7;
	
var dayText = dayGroup.selectAll("text")
                          .data(days)
                          .enter()
                          .append("text");
 var dayLabels = dayText
                   .attr("x", 0)
                   .attr("y", function(d) { return y.step*(days.indexOf(d)+1); })
                   .text(function (d) { return d; })
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "12px");

  var hourText = hourGroup.selectAll("text")
                          .data(hours)
                          .enter()
                          .append("text");
  var hourLabels = hourText
                   .attr("x", function(d) {
                     return x.step*(hours.indexOf(d)+1)+32;
                   })
                   .attr("y", y.max+20)
                   .text(function (d) { return d; })
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "12px");

d3.csv(svnLogFile, function (error, data) {
  var commitData = data;

  // e.g.: 2016-08-23T08:52:49.428146Z    [DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"]
  
  var fullDateFormat = d3.time.format('%Y-%m-%dT%H:%M:%S');
  var yearFormat = d3.time.format('%Y');
  var monthFormat = d3.time.format('%b');
  var dayOfWeekFormat = d3.time.format('%w');
  var hour = d3.time.format('%H');

  // normalize/parse data so dc can correctly sort & bin them
  // each "d" as a row in a spreadsheet
  _.each(commitData, function(d) {
    d.reversionID = d.Revision; 
	d.author = d.Author;
	d.commitdate = d.Timestamp.substring(0,19);
    d.commit_dt = fullDateFormat.parse(d.commitdate);

    d.first_had_day = dayOfWeekFormat(d.commit_dt); 
	d.first_had_hour = hour(d.commit_dt);
  }); 

  // set crossfilter
  var ndx = crossfilter(commitData);

  // create dimensions (x-axis values), using [day, hour] as dimension 
  var dayOfWeekDim = ndx.dimension(function(d){return  [d.first_had_day,d.first_had_hour];});
	  
  // create groups (y-axis values)
  var all = ndx.groupAll();
  var countPerDay = dayOfWeekDim.group().reduceCount();
	
  //get all the items, e.g. key:[3,22] value:50 
  var list = countPerDay.top(Infinity);
  var temp = _.sortBy(list, function(d){return d.key;});
  
  var scaleData = [];
  for (i=0; i< temp.length;i++){
    scaleData.push(temp[i].value)
  }

  //scaling radius 
  z = {
    data: scaleData
  }
  z.max    = d3.max(z.data)
  z.min    = d3.min(z.data)
  z.domain = [z.min, z.max]
  z.range  = [4,x.step/2 -1]
  z.scale  = d3.scale.linear().
  domain(z.domain).
  range(z.range);
  
  for (j=0; j< temp.length;j++){
    tuple = temp[j];
    commits = tuple.value;
	var yValue = parseInt(tuple.key[0]);
	var xValue = parseInt(tuple.key[1]);
	
    if (commits > 0) {
      cy    = y.step*(yValue+1);
      cx    = x.step*(xValue+1)+50;
      r     = z.scale(commits);
      title = "Commits: " + commits;
      circleGroup.append("circle")
		.attr("class", "circle1")
		.datum({"value": commits}) //hack: to enable d.value on d3.tip()...  
        .attr("cx",cx)
        .attr("cy",cy)
        .attr("r",r)
		.on('mouseover', tip.show)
		.on('mouseout', tip.hide);		
	}
 }
  });