// on document ready: DOM-dependent stuff
$( function () {

    // show the info model on click
    $( '#help' )
        .click( function () {
            $( '#infoModal' ).modal();
        } );

    // click behavior for the data selection dropdown
    $( ".dropdown-menu li a" )
        .click( function () {
            // set the text to the value that was clicked on
            // (including the nice caret)
            $( this )
                .parents( ".dropdown" )
                .find( '.btn' )
                .html( $( this ).text() + ' <span class="caret"></span>' );
            // get the filename associated with each data source
            $( this )
                .parents( ".dropdown" )
                .find( '.btn' )
                .val( $( this ).data( 'value' ) );
            console.log( $( this ).attr( 'data-ref' ) + ' SELECTED.' );
            // load the data
            loadData( $( this ).attr( 'data-ref' ), 'pred', [ 'blendid', 'corpid', 'datetime' ] );
        } );

    /**
     * Makes an ajax call to the server for the JSON data
     * @param  {string} filepath path to the data
     * @param  {string} yvar the response variable
     * @param  {Array} nonplots all values in the data which do not get plotted, e.g. timestamp, corpID, ...
     * @return {null}
     */
    function loadData( filepath, yvar, nonplots ) {
        var chartArray,
            xvals = {},
            $buttons = $( '#xbuttons' ),
            selector = '#datatable';

        // AJAX call for the JSON file
        $.ajax( {
                url: filepath,
                dataType: 'json',
                async: true
            } )
            .done( function ( data ) {
                // get the range of the response variable and put it in the input boxes
                originalRange = findYrange( data, yvar );
                $( '#ymin' )
                    .val( originalRange[ 0 ] );
                $( '#ymax' )
                    .val( originalRange[ 1 ] );

                // build up the xvals object
                $.each( data, function ( index, item ) {
                    $.each( Object.keys( item ), function ( i, key ) {
                        // skip the response variable
                        if ( key === yvar ) return;
                        if ( Object.keys( xvals ).indexOf( key ) < 0 ) {
                            xvals[ key ] = [];
                        }
                        if ( xvals[ key ].indexOf( item[ key ] ) < 0 ) {
                            xvals[ key ].push( item[ key ] );
                        }
                    } );
                } );

                console.log( 'XVALS CREATED.' );

                // keys = names of the data columns
                var keys = Object.keys( xvals ),
                    // xNames = data columns that are not in nonplots, i.e. the ones that will be plotted
                    xNames = $.grep( keys, function ( value ) {
                        return nonplots.indexOf( value ) === -1;
                    } ),
                    // otherXs = not the first value in xNames
                    otherXs = $.grep( xNames, function ( name ) {
                        return xNames[ 0 ] !== name;
                    } );

                console.log( 'KEYS: ' + keys );

                // assign one x to the rows and another x to the columns.
                // one of these might be undefined (hopefully not both)
                var gridObj = {
                    row: otherXs[ 1 ],
                    col: otherXs[ 0 ]
                };

                console.log( 'CALLING createHtmlTable.' );
                // create the table of plots and return all the plots in an array
                chartArray = createHtmlTable( data, xvals, gridObj, xNames[ 0 ], selector );
            } );
    }

    /**
     * Set the behavior of all the buttons that get dynamically generated based on the data
     * @param  {Object} data     the data in JSON format
     * @param  {Object} xvals    the xvals object. columns are keys, values are all possible values from the data
     * @param  {Object} gridvars gridvars.row, gridvars.col give the x's that are plotted on the rows and columns
     * @param  {string} plotvar  x variable that goes on the plot axes
     * @param  {string} selector the ID of the table
     * @return {null}
     */
    function initializeButtons( data, xvals, gridvars, plotvar, selector ) {
        var allXs = [ plotvar, gridvars.row, gridvars.col ];

        $( 'label[id^="label-"]' )
            .on( 'click', function () {
                var $button = $( this )[ 0 ].firstChild;
                var plotvar = $button.dataset.xname;
                var otherXs = $.grep( allXs, function ( name ) {
                    return plotvar !== name;
                } );
                var gridObj = {
                    row: otherXs[ 0 ],
                    col: otherXs[ 1 ]
                };
                createHtmlTable( data, xvals, gridObj, plotvar, selector );
            } );

        console.log( 'INITIALIZING SWAP BUTTON.' );
        console.log( data[ 0 ] );
        $( '#swap' )
            .unbind();
        $( '#swap' )
            .click( function () {
                console.log( 'SWAP BUTTON CLICKED' );
                console.log( data[ 0 ] );
                var $table = $( selector );
                var rowvar = $table.data( 'row' );
                var colvar = $table.data( 'col' );
                var plotvar = $table.data( 'plot' );
                var gridObj = {
                    row: colvar,
                    col: rowvar
                };
                console.log( 'CALLING createHtmlTable.' );
                createHtmlTable( data, xvals, gridObj, plotvar, selector );
                return false;
            } );
        console.log( 'SWAP BUTTON INITIALIZED.' );

        $( '#change-range' )
            .click( function () {
                var $table = $( selector );
                var rowvar = $table.data( 'row' );
                var colvar = $table.data( 'col' );
                var plotvar = $table.data( 'plot' );
                var gridObj = {
                    row: rowvar,
                    col: colvar
                };
                createHtmlTable( data, xvals, gridObj, plotvar, selector );
            } );

        // Reset the min and max to their original values (determined from the data) and redraw the charts
        $( '#reset-range' )
            .click( function () {
                $( '#ymin' )
                    .val( originalRange[ 0 ] );
                $( '#ymax' )
                    .val( originalRange[ 1 ] );
                $( '#change-range' )
                    .click();
            } );

        $( '#export' )
            .unbind();
        // export the charts on click
        $( '#export' )
            .click( function () {
                var $table = $( selector );
                var rowvar = $table.data( 'row' );
                var colvar = $table.data( 'col' );
                var chartArray = [];
                chartArray.numRows = xvals[ rowvar ] === undefined ? 1 : xvals[ rowvar ].length;
                chartArray.numCols = xvals[ colvar ] === undefined ? 1 : xvals[ colvar ].length;
                $( '.chart-holder, .chart-holder-column' )
                    .each( function () {
                        chartArray.push( $( this ) .highcharts() );
                    } );
                Highcharts.exportCharts( chartArray );
            } );

    }

    /**
     * creates the table and places the plots in the appropriate cell
     * @param  {Object} data     the data in JSON format
     * @param  {Object} xvals    the xvals object. columns are keys, values are all possible values from the data
     * @param  {Object} gridvars gridvars.row, gridvars.col give the x's that are plotted on the rows and columns
     * @param  {string} plotvar  x variable that goes on the plot axes
     * @param  {string} selector the ID of the table
     * @return {Array}           contains all of the plots that were generated
     */
    function createHtmlTable( data, xvals, gridvars, plotvar, selector ) {
        console.log( 'createHtmlTable CALLED.' );
        console.log( 'XVAL KEYS: ' + Object.keys( xvals ) );
        // console.log('grid vars: ');
        // console.log(gridvars);
        // console.log('plot var: ' + plotvar);

        var $buttons = $( '#xbuttons' );

        $( selector )
            .html( '' );
        $buttons.html( '' );

        var rowvar = gridvars.row,
            colvar = gridvars.col,
            chartArray = [];

        // assign info on which variable is plotted where to the table element itself
        $( selector )
            .data( {
                'row': rowvar,
                'col': colvar,
                'plot': plotvar
            } );

        // console.log(rowvar + ' : ' + colvar);

        // call some helper functions. there are cases where we only have one other x variable,
        // causing the grid to have only one row or one column
        if ( rowvar === undefined ) {
            // console.log('SHOULD CREATE ONE ROW');
            chartArray = createSingleRow( data, xvals, colvar, plotvar, selector );
        } else if ( colvar === undefined ) {
            // console.log('SHOULD CREATE ONE COLUMN');
            chartArray = createSingleCol( data, xvals, rowvar, plotvar, selector );
        } else {
            chartArray = createFullTable( data, xvals, rowvar, colvar, plotvar, selector );
        }

        // adjust chart size
        // TODO: chart size doesn't do anything
        chartArray.map( function ( chart ) {
            setChartSize( chart );
        } );

        var keys = Object.keys( xvals ),
            // sort this so that button order doesn't change each time
            allXs = [ plotvar, gridvars.row, gridvars.col ].sort();

        $.each( allXs, function ( index, xname ) {
            // assign the "active" class to the appropriate button
            var isActive = '';
            if ( xname === plotvar ) {
                isActive = ' active';
            }

            // create the buttons for each x
            if ( xname !== undefined )
                $buttons.append(
                    $( '<label/>', {
                        class: 'btn btn-primary' + isActive,
                        id: 'label-' + xname
                    } )
                    .append(
                        $( '<input/>', {
                            type: 'radio',
                            id: 'btn-' + xname,
                            'data-xname': xname
                        } )
                    )
                    .append( 'Plot ' + xname )
                );
        } );

        // set the button behavior
        initializeButtons( data, xvals, gridvars, plotvar, selector );

        return chartArray;
    }

} );

var originalRange = [];

////////////////// FUNCTIONS

function setChartSize( chart ) {
    var selector = '#' + chart.options.chart.renderTo;
    chart.setSize( $( selector )
        .width(), $( selector )
        .height() );
    return false;
}

function dynamicSort( property ) {
    var sortOrder = 1;
    if ( property[ 0 ] === "-" ) {
        sortOrder = -1;
        property = property.substr( 1 );
    }
    return function ( a, b ) {
        var result = ( a[ property ] < b[ property ] ) ? -1 : ( a[ property ] > b[ property ] ) ? 1 : 0;
        return result * sortOrder;
    };
}

/**
 * Create a global getSVG method that takes an array of charts as an argument. The SVG is returned as an argument in the callback.
 */
Highcharts.getSVG = function ( charts, numRows, numCols, options, callback ) {
    console.log( charts );
    console.log( numRows + ' x ' + numCols );

    var svgArr = [],
        top = 20,
        width = 20,
        i,
        svgResult = function ( svgres ) {
            var row = Math.floor( i / numCols );
            var col = i % numCols;
            var svg = svgres.replace( '<svg', '<g transform="translate(' + width + ',' + top + ')" ' );
            svg = svg.replace( '</svg>', '</g>' );
            if ( col === numCols - 1 ) {
                // we are at the end of the row. drop down to the beginning of the next row
                top += 400;
                if ( svgArr.length !== charts.length - 1 ) {
                    width = 0;
                } else {
                    width += 600;
                }
            } else {
                width += 600;
            }
            svgArr.push( svg );
            if ( svgArr.length === charts.length ) {
                top += 20;
                width += 60;
                var svgAll = '<svg height="' + top + '" width="' + width + '" version="1.1" xmlns="http://www.w3.org/2000/svg">' + svgArr.join( '' ) + '</svg>';
                callback( svgAll );
            }
        };
    for ( i = 0; i < charts.length; ++i ) {
        charts[ i ].getSVGForLocalExport( options, {}, function () {
            console.log( "Failed to get SVG" );
        }, svgResult );
    }
};


/**
 * Create a global exportCharts method that takes an array of charts as an argument,
 * and exporting options as the second argument
 */
Highcharts.exportCharts = function ( charts, options ) {
    // Merge the options
    options = Highcharts.merge( Highcharts.getOptions().exporting, options );
    var imageType = options && options.type || 'image/png';

    // Get SVG asynchronously and then download the resulting SVG
    Highcharts.getSVG( charts, charts.numRows, charts.numCols, options,
        function ( svg ) {
            Highcharts.downloadSVGLocal( svg,
                ( options.filename || 'chart' ) + '.' + ( imageType === 'image/svg+xml' ? 'svg' : imageType.split( '/' )[ 1 ] ),
                imageType,
                options.scale || 2,
                function () {
                    console.log( "Failed to export on client side" );
                } );
        } );
};

/**
 * Get the range of the response data across all x's
 * @param  {Object} data  The data
 * @param  {string} yvar  The name of the response variable
 * @return {array}        An array of length two, the first entry is the min and the second is the max
 */
function findYrange( data, yvar ) {
    var min = Infinity;
    var max = -Infinity;
    $.each( data, function ( index, obj ) {
        value = obj[ yvar ];
        if ( value < min ) {
            min = value;
        } else if ( value > max ) {
            max = value;
        }
    } );
    return [ min, max ];
}

/**
 * Finds all data with a given row and column value. These are the data points that will be grouped together into a series for plotting.
 * @param  {Object} data   The data that was read from JSON
 * @param  {string} rowvar The x variable that will be displayed along the rows of the table
 * @param  {string} colvar The x variable that will be displayed along the column of the table
 * @param  {float}  rowval The desired value of rowvar
 * @param  {float}  colval The desired value of colvar
 * @return {array}         An array consisting of objects, one for each data point
 */
function pullCellData( data, rowvar, row, colvar, col ) {
    var result = [];
    $.each( data, function ( index, obj ) {
        if ( rowvar === '' ) {
            if ( obj[ colvar ] === col ) {
                result.push( obj );
            }
        } else if ( colvar === '' ) {
            if ( obj[ rowvar ] === row ) {
                result.push( obj );
            }
        } else {
            if ( obj[ rowvar ] === row && obj[ colvar ] === col ) {
                result.push( obj );
            }
        }
    } );
    return result;
}

/**
 * Draws the chart and puts it into the DOM
 * @param  {array}  cellData  Data for the chart (output from pullCellData())
 * @param  {Object} xvals     Object where the keys are the x variables and the values are arrays containing all possible values of that x
 * @param  {string} rowvar    The x variable that will be displayed along the rows of the table
 * @param  {string} colvar    The x variable that will be displayed along the column of the table
 * @param  {float}  rowval    The desired value of rowvar
 * @param  {float}  colval    The desired value of colvar
 * @param  {string} plotvar   The x variable that will be plotted along the x axes of the plots
 * @return {null}             No return value
 */
function pushCellDataToChart( cellData, xvals, rowvar, row, colvar, col, plotvar ) {
    //  ID of <td> element for this plot
    var plotId = 'plot-' + [ rowvar, row, colvar, col ].join( '' );
    var setMin = $( '#ymin' ).val();
    var setMax = $( '#ymax' ).val();
    var titleText = '';
    if ( rowvar === '' ) {
        titleText = colvar + ' = ' + col;
    } else if ( colvar === '' ) {
        titleText = rowvar + ' = ' + row;
    } else {
        titleText = rowvar + ' = ' + row + ', ' + colvar + ' = ' + col;
    }

    //  Options for the chart. Mostly deals with hiding axis labels and text so that it fits better inside a table.
    var options = {
        exporting: {
            chartOptions: {
                chart: {
                    margin: undefined
                },
                title: {
                    text: titleText
                },
                xAxis: {
                    title: {
                        text: plotvar
                    }
                }
            },
            sourceHeight: 400
        },
        chart: {
            renderTo: plotId,
            type: 'spline',
            backgroundColor: null,
            borderWidth: 0,
            margin: [ 2, 0, 2, 0 ],
            height: 200,
            width: undefined,
            style: {
                overflow: 'visible'
            }
        },
        title: {
            text: ''
        },
        credits: {
            enabled: false
        },
        xAxis: {
            title: {
                text: ''
            }
        },
        yAxis: {
            min: setMin,
            max: setMax,
            title: {
                text: ''
            },
            labels: {
                reserveSpace: true
            },
            opposite: true
        },
        legend: {
            enabled: false
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            borderColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: 20,
            borderWidth: 1,
            shadow: false,
            useHTML: true,
            hideDelay: 0,
            shared: true,
            padding: 0,
            positioner: function ( w, h, point ) {
                return {
                    x: point.plotX - w / 2,
                    y: point.plotY - h
                };
            },
            //  Set the information displayed in the tooltip
            formatter: function () {
                var str = '<h4>' + plotvar + ': ' + this.x + '</h4><table class="table table-condensed" id="tooltip-table"><tr><th>Blend ID</th><th>Prediction</th></tr>';
                var pts = this.points.sort( dynamicSort( '-y' ) );
                $.each( pts, function ( index, point ) {
                    str += '<tr><td style="color: ' + point.series.color + '"><b>' + point.series.name + '</b></td><td>' + point.y + '</td></tr>';
                } );

                str += '</table>';
                return str;
            }
        },
        plotOptions: {
            series: {
                animation: false,
                lineWidth: 2,
                shadow: false,
                states: {
                    hover: {
                        lineWidth: 2
                    }
                },
                marker: {
                    radius: 3,
                    states: {
                        hover: {
                            radius: 4
                        }
                    }
                },
                fillOpacity: 0.25
            }
        },
        series: []
    };

    //  For each formulation, push a new series into the chart
    xvals.blendid.map( function ( form ) {
        options.series.push( {
            name: form,
            data: []
        } );
    } );

    //  For each data point...
    $.each( cellData, function ( index, obj ) {
        var point = {
            x: obj[ plotvar ],
            y: obj.pred
        };
        //  ...find the series that matches the formulation name and push it to the data array
        $.each( options.series, function ( index, series ) {
            if ( obj.blendid === series.name ) {
                series.data.push( point );
            }
        } );
    } );

    //  Draw the chart
    var c = new Highcharts.chart( options, function () {
        //  On callback, add a legend for the different formulations
        var $legend = $( '#legend' );

        //  Each chart should have identical legends, so we only need to do this once. If the legend div already has some html added to it, that means the legend is already there so we don't need to bother with the rest
        if ( $legend.html() !== '' ) return;

        //  For each series in the chart, add a legend entry. See http://getbootstrap.com/components/#media for the layout
        $.each( this.series, function ( index, series ) {
            var $legendEntry = $( '<div/>', {
                class: 'media'
            } );
            var $legendColorSpot = $( '<div/>', {
                class: 'media-left'
            } );
            var $legendTextSpot = $( '<div/>', {
                class: 'media-body'
            } );
            var $newColorDiv = $( '<div/>', {
                    class: 'media-object'
                } )
                .css( {
                    //  Fill the square with the correct color from the chart
                    "background-color": series.color,
                    "width": "32px",
                    "height": "32px"
                } );
            //  Put the formulation name beside the colored square
            var $newLegendDiv = $( '<h4/>', {
                    class: 'media-heading'
                } )
                .text( series.name );

            //  Append everything to the legend
            $legendColorSpot.append( $newColorDiv );
            $legendTextSpot.append( $newLegendDiv );
            $legendEntry.append( $legendColorSpot );
            $legendEntry.append( $legendTextSpot );
            $legend.append( $legendEntry );
        } );
    } );

    return c;
}

function createSingleRow( data, xvals, colvar, plotvar, selector ) {
    console.log( 'INSIDE CREATE SINGLE ROW. XVALS: ' + Object.keys( xvals ) );
    console.log( 'colvar = ' + colvar );
    var chartArray = [],
        columns = xvals[ colvar ],
        $headerFlexbox = $( '<div/>', {
            class: 'flex-row'
        } ),
        $row = $( '<div/>', {
            class: 'flex-row'
        } ),
        $selector = $( selector );

    columns.map( function ( col ) {
        var plotId = [ colvar, col ].join( '' );
        $headerFlexbox.append( $( '<div/>', {
                class: 'column-header'
            } )
            .html( '<h4>' + colvar + ' : ' + col + '</h4>' ) );
        $row.append( $( '<div/>', {
            id: 'plot-' + plotId,
            class: 'chart-holder'
        } ) );
    } );

    $selector.append( $headerFlexbox );
    $selector.append( $row );

    columns.map( function ( col ) {
        var cellData = pullCellData( data, '', '', colvar, col );
        var c = pushCellDataToChart( cellData, xvals, '', '', colvar, col, plotvar );
        chartArray.push( c );
    } );

    chartArray.numRows = 1;
    chartArray.numCols = columns.length;

    return chartArray;
}

function createSingleCol( data, xvals, rowvar, plotvar, selector ) {
    console.log( 'INSIDE CREATE SINGLE COL. XVALS: ' + Object.keys( xvals ) );
    console.log( 'rowvar = ' + rowvar );
    var chartArray = [],
        rows = xvals[ rowvar ],
        $headerFlexbox = $( '<div/>', {
            class: 'flex-column'
        } ),
        $col = $( '<div/>', {
            class: 'flex-column'
        } ),
        $selector = $( selector );

    rows.map( function ( row ) {
        var plotId = [ rowvar, row ].join( '' );
        $headerFlexbox.append( $( '<div/>', {
                class: 'column-header'
            } )
            .html( '<h4>' + rowvar + ' : ' + row + '</h4>' ) );
        $col.append( $( '<div/>', {
            id: 'plot-' + plotId,
            class: 'chart-holder-column'
        } ) );
    } );

    $selector.append( $headerFlexbox );
    $selector.append( $col );

    rows.map( function ( row ) {
        var cellData = pullCellData( data, rowvar, row, '', '' );
        var c = pushCellDataToChart( cellData, xvals, rowvar, row, '', '', plotvar );
        chartArray.push( c );
    } );

    chartArray.numRows = rows.length;
    chartArray.numCols = 1;

    return chartArray;
}

function createFullTable( data, xvals, rowvar, colvar, plotvar, selector ) {
    console.log( 'INSIDE CREATE FULL TABLE. XVALS: ' + Object.keys( xvals ) );
    console.log( 'colvar = ' + colvar );
    var chartArray = [],
        columns = xvals[ colvar ],
        rows = xvals[ rowvar ],
        $headerFlexbox = $( '<div/>', {
            class: 'flex-row'
        } ),
        $selector = $( selector );

    $headerFlexbox.append( $( '<div/>', {
        class: 'row-header column-header'
    } ) );

    columns.map( function ( col ) {
        $headerFlexbox.append( $( '<div/>', {
                class: 'column-header'
            } )
            .html( '<h4>' + colvar + ' : ' + col + '</h4>' ) );
    } );

    $selector.append( $headerFlexbox );

    rows.map( function ( row ) {
        var $row = $( '<div/>', {
            class: 'flex-row'
        } );
        $row.append( $( '<div/>', {
                class: 'row-header'
            } )
            .html( '<h4>' + rowvar + ' : ' + row + '</h4>' ) );
        columns.map( function ( col ) {
            var plotId = [ rowvar, row, colvar, col ].join( '' );
            $row.append( $( '<div/>', {
                id: 'plot-' + plotId,
                class: 'chart-holder'
            } ) );
        } );
        $selector.append( $row );
    } );

    rows.map( function ( row ) {
        columns.map( function ( col ) {
            var cellData = pullCellData( data, rowvar, row, colvar, col );
            var c = pushCellDataToChart( cellData, xvals, rowvar, row, colvar, col, plotvar );
            chartArray.push( c );
        } );
    } );

    chartArray.numRows = rows.length;
    chartArray.numCols = columns.length;

    return chartArray;
}
