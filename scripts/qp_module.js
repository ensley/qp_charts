var qp = ( function() {

    // default options
    var config = {
        '$container' : $('#datatable'),
        '$buttons' : $('#xbuttons'),
        'filepath' : '/data/qlife_mtm.json',
        'yvar' : 'pred',
        'seriesvar' : 'blendid',
        'nonplots' : [ 'corpid', 'datetime' ]
    };

    // "global" vars
    var allData = [];           // the raw JSON
    var originalRange = [];     // the range of the y-axis data. allows easy resetting
    var xvals = {};             // see "createXvals"
    var xNames = [];            // the x variables
    var otherXs = [];           // the x variables that are not being plotted at the moment (they go on the rows and/or columns of the grid)
    var chartArray = [];        // all the Highcharts objects currently on the screen. also has numRows and numCols properties

    // set everything up
    var init = function( options ) {

        // include user specified options
        if( options && typeof( options ) === 'object' ) {
            $.extend( config, options );
        }

        // hide all the controls until we've picked a data source from the dropdown
        $( '.hide-at-start' ).css( 'display', 'none' );

        setupHelpButton();
        setupDropdown();
        setupRange();
        setupExport();

    };

    // bind the modal (from bootstrap.js) to its button
    var setupHelpButton = function() {

        $( '#help' ).click( function() {
            $( '#infoModal' ).modal();
        });

    };

    // set dropdown menu behavior
    var setupDropdown = function() {

        $( '.dropdown-menu li a' ).click( function() {
            var $this = $( this );
            var $clicked = $this.parents( '.dropdown' ).find( '.btn' );
            $clicked.html( $this.text() + ' <span class="caret"></span>' );
            $clicked.val( $this.data( 'value' ) );
            config.filepath = $this.attr( 'data-ref' );
            // load the data on click
            loadData();
        });

    };

    // set behavior of the "y axis" form
    var setupRange = function() {

        $( '#change-range' ).unbind();
        // when "Update" is clicked, redraw the charts
        $( '#change-range' ).click( function() {
            chartArray = createHtmlTable( config.$container.data() );
        });

        $( '#reset-range' ).unbind();
        // when "Reset" is clicked, revert to the original range and redraw
        $( '#reset-range' ).click( function() {
            $( '#ymin' ).val( originalRange[0] );
            $( '#ymax' ).val( originalRange[1] );
            chartArray = createHtmlTable( config.$container.data() );
        });

    };

    // set export button behavior
    var setupExport = function() {
        $( '#export' ).unbind();
        $( '#export' ).click( function() {
            Highcharts.exportCharts( chartArray );
        });
    };

    // load the data
    var loadData = function() {
        // now we can show the controls
        $( '.hide-at-start' ).css( 'display', '' );

        // AJAX call to the server, at the url given in the initial options
        $.ajax( {
            url: config.filepath,
            dataType: 'json',
            async: true
        } ).done( function( data ) {
            // set those globals
            allData = data;
            originalRange = findYrange( data, config.yvar );
            xvals = createXvals( data );
            xNames = $.grep( Object.keys( xvals ), function( value ) {
                return config.nonplots.concat( config.seriesvar ).indexOf( value ) === -1;
            });
            otherXs = $.grep( xNames, function( name ) {
                return xNames[0] !== name;
            });

            // put the range into the form initially
            $( '#ymin' ).val( originalRange[0] );
            $( '#ymax' ).val( originalRange[1] );

            // this object gets passed around a lot.
            // indicates which x gets plotted and which goes on the rows/cols
            var gridObj = {
                'row': otherXs[1],
                'col': otherXs[0],
                'plot': xNames[0]
            };

            // draw the charts
            chartArray = createHtmlTable( gridObj );
        });
    };

    // draws the charts and puts them in the DOM. returns an array of the charts.
    // we have a few cases to handle: having an x on a row, having an x on a column,
    // and having x's on both. it changes how we insert everything in the DOM.
    // these cases are handled in helper functions.
    var createHtmlTable = function( gridObj ) {

        // clear the containers for the charts and for the x buttons
        config.$container.html( '' );
        config.$buttons.html( '' );

        // bind the grid object to the container
        config.$container.data( gridObj );

        // delegate the chart creation to helpers
        if( gridObj.row === undefined ) {
            chartArray = createSingleRow( gridObj );
        } else if( gridObj.col === undefined ) {
            chartArray = createSingleCol( gridObj );
        } else {
            chartArray = createFullTable( gridObj );
        }

        // create and set up the x buttons
        createXbuttons( gridObj );
        initializeButtons( gridObj );

        return chartArray;
    };

    // set up the x buttons and the swap button
    var initializeButtons = function( gridObj ) {

        var allXs = $.map( gridObj, function( value ) {
            return value;
        });

        // set up the x buttons
        $( 'label[id^="label-"]' ).on( 'click', function() {
            var $button = $( this )[0].firstChild;
            var newPlotvar = $button.dataset.xname;
            var newOtherXs = $.grep( allXs, function( name ) {
                return newPlotvar !== name;
            });
            var newGridObj = {
                'row': newOtherXs[0],
                'col': newOtherXs[1],
                'plot': newPlotvar
            };
            // redraw the charts
            chartArray = createHtmlTable( newGridObj );
        });

        // set up the swap button
        $( '#swap' ).unbind();
        $( '#swap' ).click( function() {
            var newGridObj = {
                'row': config.$container.data( 'col' ),
                'col': config.$container.data( 'row' ),
                'plot': config.$container.data( 'plot' )
            };
            // redraw the charts
            chartArray = createHtmlTable( newGridObj );
            // make sure no weird default behavior happens (maybe unnecessary?)
            return false;
        });

    };

    // case where we have 2 non-plotted x's, one for the rows and one for the columns
    var createFullTable = function( gridObj ) {
        // reset chartArray global
        chartArray = [];
        // get all values of the two x's from xvals
        var columns = xvals[ gridObj.col ];
        var rows = xvals[ gridObj.row ];
        // that's right, we're going flexbox
        var $headerFlexbox = $( '<div/>', { class: 'flex-row' } );

        // jQuery DOM stuff, whatever
        $headerFlexbox.append( $( '<div/>', {
            class: 'chart-holder row-header'
        } ) );

        columns.map( function( col ) {
            $headerFlexbox.append( $( '<div/>', {
                class: 'chart-holder'
            } ).html( '<h4>' + gridObj.col + ' : ' + col + '</h4>' ) );
        } );

        config.$container.append( $headerFlexbox );

        rows.map( function( row ) {
            var $row = $( '<div/>', {
                class: 'flex-row'
            } );
            $row.append( $( '<div/>', {
                class: 'row-header'
            } ).html( '<h4>' + gridObj.row + ' : ' + row + '</h4>' ) );
            columns.map( function( col ) {
                var plotId = [ gridObj.row, row, gridObj.col, col ].join( '' );
                $row.append( $( '<div/>', {
                    id: 'plot-' + plotId,
                    class: 'chart-holder'
                } ) );
            } );
            config.$container.append( $row );
        } );

        // put the charts in all those divs
        rows.map( function( row ) {
            columns.map( function( col ) {
                var chart = drawChart( gridObj, row, col );
                // don't forget to add the chart to the array
                chartArray.push( chart );
            } );
        } );

        // make sure chartArray knows how many rows and cols there were.
        // this is so that the export all function can position everything
        // just as it was on the screen.
        chartArray.numRows = rows.length;
        chartArray.numCols = columns.length;

        return chartArray;
    };

    // case where we have 1 non-plotted x and it's going along the "columns"
    // (therefore creating one row of charts)
    var createSingleRow = function( gridObj ) {
        // reset chartArray global
        chartArray = [];
        var columns = xvals[ gridObj.col ];

        // jQuery DOM stuff
        $headerFlexbox = $( '<div/>', { class: 'flex-row' } );
        $row = $( '<div/>', { class: 'flex-row' } );
        columns.map( function( col ) {
            var plotId = [ gridObj.col, col ].join( '' );
            $headerFlexbox.append( $( '<div/>', {
                class: 'column-header'
            } ).html( '<h4>' + gridObj.col + ' : ' + col + '</h4>' ) );
            $row.append( $( '<div/>', {
                id: 'plot-' + plotId,
                class: 'chart-holder'
            } ) );
        } );

        config.$container.append( $headerFlexbox );
        config.$container.append( $row );

        // put the charts in the divs and push them to the array
        columns.map( function( col ) {
            var chart = drawChart( gridObj, undefined, col );
            chartArray.push( chart );
        } );

        // update rows and cols count
        chartArray.numRows = 1;
        chartArray.numCols = columns.length;

        return chartArray;
    };

    // case where we have 1 non-plotted x and it's going along the "rows"
    // (therefore creating one column of charts)
    var createSingleCol = function( gridObj ) {
        // reset chartArray global
        chartArray = [];
        var rows = xvals[ gridObj.row ];

        // jQuery DOM stuff
        var $headerFlexbox = $( '<div/>', { class: 'flex-column' } );
        var $col = $( '<div/>', { class: 'flex-column' } );
        rows.map( function( row ) {
            var plotId = [ gridObj.row, row ].join( '' );
            $headerFlexbox.append( $( '<div/>', {
                class: 'row-header'
            } ).html( '<h4>' + gridObj.row + ' : ' + row + '</h4>' ) );
            $col.append( $( '<div/>', {
                id: 'plot-' + plotId,
                class: 'chart-holder-column'
            } ) );
        } );

        config.$container.append( $headerFlexbox );
        config.$container.append( $col );

        // put the charts in the divs and push them to the array
        rows.map( function( row ) {
            var chart = drawChart( gridObj, row, undefined );
            chartArray.push( chart );
        } );

        // update rows and cols count
        chartArray.numRows = rows.length;
        chartArray.numCols = 1;

        return chartArray;
    };

    // finally, the function that actually draws the charts
    var drawChart = function( gridObj, row, col ) {
        // get all the data points that should go into this chart
        var cellData = pullCellData( gridObj, row, col );
        // build up the correct ID so Highcharts knows where to draw
        var plotId = 'plot-' + [ gridObj.row, row, gridObj.col, col ].join( '' );
        // get the y axis range from the form
        var setMin = $( '#ymin' ).val();
        var setMax = $( '#ymax' ).val();

        // this text goes in the title of the exported charts only
        var titleText = '';
        if( gridObj.row === undefined ) {
            titleText = gridObj.col + ' = ' + col;
        } else if( gridObj.col === undefined ) {
            titleText = gridObj.row + ' = ' + row;
        } else {
            titleText = gridObj.row + ' = ' + row + ', ' + gridObj.col + ' = ' + col;
        }

        //  Options for the chart. Mostly deals with hiding defaults so that everything fits nicer when small.
        var options = {
            // these options only affect the exported chart
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
                            text: gridObj.plot
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
                    var str = '<h4>' + gridObj.plot + ': ' + this.x + '</h4><table class="table table-condensed" id="tooltip-table"><tr><th>Blend ID</th><th>Prediction</th></tr>';
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

        // create one series for each distinct value of seriesvar
        xvals[ config.seriesvar ].map( function( form ) {
            options.series.push( {
                name: form,
                data: []
            } );
        } );

        // add the data points
        $.each( cellData, function( index, obj ) {
            var point = {
                x: obj[ gridObj.plot ],
                y: obj[ config.yvar ]
            };

            $.each( options.series, function( index, series ) {
                if( obj[ config.seriesvar ] === series.name ) {
                    series.data.push( point );
                }
            } );
        } );

        // draw the chart
        var c = new Highcharts.chart( options, function() {
            // on callback, add the seriesvar's to the legend if they aren't there already
            var $legend = $( '#legend' );
            // each chart should have the exact same legend. so if there's something there, we can move on
            if( $legend.html() !== '' ) return;

            $.each( this.series, function( index, series ) {
                var $legendEntry = $( '<div/>', { class: 'media' } );
                var $legendColorSpot = $( '<div/>', { class: 'media-left' } );
                var $legendTextSpot = $( '<div/>', { class: 'media-body' } );
                var $newColorDiv = $( '<div/>', { class: 'media-object' } )
                    .css( {
                        'background-color': series.color,
                        'width': '32px',
                        'height': '32px'
                    } );
                var $newLegendDiv = $( '<h4/>', { class: 'media-heading' } )
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

    };

    // finds all the data points that belong in a particular chart
    var pullCellData = function( gridObj, row, col ) {
        var result = [];
        $.each( allData, function( index, obj ) {
            if( gridObj.row === undefined ) {
                if( obj[ gridObj.col ] === col ) {
                    result.push( obj );
                }
            } else if( gridObj.col === undefined ) {
                if( obj[ gridObj.row ] === row ) {
                    result.push( obj );
                }
            } else {
                if( obj[ gridObj.row ] === row && obj[ gridObj.col ] === col ) {
                    result.push( obj );
                }
            }
        } );
        return result;
    };

    // helper function. finds the range of the y variable in the data
    var findYrange = function( data, yvar ) {
        var min = Infinity;
        var max = -Infinity;
        $.each( data, function( index, obj ) {
            value = obj[ yvar ];
            if( value < min ) {
                min = value;
            } else if( value > max ) {
                max = value;
            }
        } );
        return [ min, max ];
    };

    // helper function. creates the xvals object.
    // the keys are the x variable names, the properties are
    // arrays containing all values of that variable. e.g.
    //  xvals = {
    //      load:   [ 0, 1 ],
    //      srr:    [ 1, 5, 10, 20 ],
    //      temp:   [ 40, 60, 80, 100, 120, 140 ]
    //  }
    var createXvals = function( data ) {
        var xvals = {};
        $.each( data, function( index, item ) {
            $.each( Object.keys( item ), function( i, key ) {
                if( key === config.yvar ) return;
                if( Object.keys( xvals ).indexOf( key ) < 0 ) {
                    xvals[key] = [];
                }
                if( xvals[key].indexOf( item[key] ) < 0) {
                    xvals[key].push( item[key] );
                }
            });
        });
        return xvals;
    };

    // helper function.
    // create a "Plot ____" button for each x, and add it to the DOM.
    var createXbuttons = function( gridObj ) {
        var allXs = $.map( gridObj, function( value ) {
            return value;
        }).sort(); // sort it, otherwise the order of the buttons will change each click!

        $.each( allXs, function( index, xname ) {
            var isActive = '';
            if( xname === gridObj.plot ) {
                isActive = ' active';
            }

            if( xname !== undefined ) {
                config.$buttons.append(
                    $( '<label/>', {
                        class: 'btn btn-primary' + isActive,
                        id: 'label-' + xname
                    } ).append(
                        $( '<input/>', {
                            type: 'radio',
                            id: 'btn-' + xname,
                            'data-xname': xname
                        } )
                    ).append( 'Plot ' + xname )
                );
            }
        });
    };

    // helper function.
    // allows sorting an object's keys by their (numeric) property value.
    // used to sort the data in the chart tooltips
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

    return {
        init: init
    };

})();

$(function() {
    qp.init();
});

// HOW TO USE THIS:
// Pass options to qp.init. Defaults are for the quick example, probably should be overridden. Sorry for the bad names.
//      qp.init({
//          'filepath': '/path/to/data.json',       - data must be in JSON format.
//          'yvar': 'pred',                         - the name of the prediction variable. probably always 'pred'.
//          'seriesvar': 'blendid',                 - the name of the blend ID variable. so Highcharts knows which points should be connected into curves.
//          'nonplots': [ 'other', 'vars' ]         - any variables that are in the JSON file and are NOT yvar, seriesvar, or any of the x's.
//      })
