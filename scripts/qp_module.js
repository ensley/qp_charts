var app = (function() {

    var config = {
        '$container' : $('#datatable'),
        '$buttons' : $('#xbuttons'),
        'filepath' : '/data/qlife_mtm.json',
        'yvar' : 'pred',
        'seriesvar' : 'blendid',
        'nonplots' : [ 'blendid', 'corpid', 'datetime' ]
    };

    var allData = [];
    var originalRange = [];
    var xvals = {};
    var xNames = [];
    var otherXs = [];
    var chartArray = [];

    var init = function() {
        setupHelpButton();
        setupDropdown();
        setupRange();
        setupExport();
    };

    var setupHelpButton = function() {
        $( '#help' ).click( function() {
            $( '#infoModal' ).modal();
        });
    };

    var setupDropdown = function() {
        $( '.dropdown-menu li a' ).click( function() {
            var $this = $( this );
            var $clicked = $this.parents( '.dropdown' ).find( '.btn' );
            $clicked.html( $this.text() + ' <span class="caret"></span>' );
            $clicked.val( $this.data( 'value' ) );
            config.filepath = $this.attr( 'data-ref' );
            console.log( config );
            loadData();
        });
    };

    var setupRange = function() {
        $( '#change-range' ).unbind();
        $( '#change-range' ).click( function() {
            console.log( 'CHANGE RANGE BUTTON CLICKED.' );
            console.log( 'CALLING createHtmlTable FROM CHANGE RANGE BUTTON.' );
            chartArray = createHtmlTable( config.$container.data() );
        });

        $( '#reset-range' ).unbind();
        $( '#reset-range' ).click( function() {
            $( '#ymin' ).val( originalRange[0] );
            $( '#ymax' ).val( originalRange[1] );
            $( '#change-range' ).click();
        });

        $( '.hide-at-start' ).css( 'display', 'none' );

    };

    var setupExport = function() {
        $( '#export' ).unbind();
        $( '#export' ).click( function() {
            Highcharts.exportCharts( chartArray );
        });
    };

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

    var createXbuttons = function( gridObj ) {
        var allXs = $.map( gridObj, function( value ) {
            return value;
        }).sort();

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

    var loadData = function() {
        $( '.hide-at-start' ).css( 'display', '' );
        console.log( 'LOAD DATA CALLED. FILEPATH: ' + config.filepath );
        $.ajax( {
            url: config.filepath,
            dataType: 'json',
            async: true
        } ).done( function( data ) {
            console.log( 'DATA LOADED.' );
            allData = data;

            originalRange = findYrange( data, config.yvar );
            $( '#ymin' ).val( originalRange[0] );
            $( '#ymax' ).val( originalRange[1] );

            xvals = createXvals( data );

            console.log( 'XVALS CREATED.' );

            xNames = $.grep( Object.keys( xvals ), function( value ) {
                return config.nonplots.indexOf( value ) === -1;
            });

            otherXs = $.grep( xNames, function( name ) {
                return xNames[0] !== name;
            });

            var gridObj = {
                'row': otherXs[1],
                'col': otherXs[0],
                'plot': xNames[0]
            };

            chartArray = createHtmlTable( gridObj );
        });
    };

    var createHtmlTable = function( gridObj ) {
        console.log( 'createHtmlTable CALLED.' );

        config.$container.html( '' );
        config.$buttons.html( '' );

        config.$container.data( gridObj );

        if( gridObj.row === undefined ) {
            chartArray = createSingleRow( gridObj );
        } else if( gridObj.col === undefined ) {
            chartArray = createSingleCol( gridObj );
        } else {
            chartArray = createFullTable( gridObj );
        }

        createXbuttons( gridObj );
        initializeButtons( gridObj );

        return chartArray;
    };

    var initializeButtons = function( gridObj ) {
        console.log( 'initializeButtons CALLED.' );
        var allXs = $.map( gridObj, function( value ) {
            return value;
        });

        console.log( 'INITIALIZING X BUTTONS.' );
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
            console.log( 'CALLING createHtmlTable FROM X BUTTON.' );
            chartArray = createHtmlTable( newGridObj );
        });
        console.log( 'X BUTTONS INITIALIZED.' );

        console.log( 'INITIALIZING SWAP BUTTON.' );
        $( '#swap' ).unbind();
        $( '#swap' ).click( function() {
            console.log( 'SWAP BUTTON CLICKED' );
            var newGridObj = {
                'row': config.$container.data( 'col' ),
                'col': config.$container.data( 'row' ),
                'plot': config.$container.data( 'plot' )
            };
            console.log( 'CALLING createHtmlTable FROM SWAP BUTTON.' );
            chartArray = createHtmlTable( newGridObj );
            return false;
        });
        console.log( 'SWAP BUTTON INITIALIZED' );

    };

    var createFullTable = function( gridObj ) {
        chartArray = [];
        var columns = xvals[ gridObj.col ];
        var rows = xvals[ gridObj.row ];
        var $headerFlexbox = $( '<div/>', { class: 'flex-row' } );

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

        rows.map( function( row ) {
            columns.map( function( col ) {
                var chart = drawChart( gridObj, row, col );
                chartArray.push( chart );
            } );
        } );

        chartArray.numRows = rows.length;
        chartArray.numCols = columns.length;

        return chartArray;
    };

    var createSingleRow = function( gridObj ) {
        chartArray = [];
        var columns = xvals[ gridObj.col ];
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

        columns.map( function( col ) {
            var chart = drawChart( gridObj, undefined, col );
            chartArray.push( chart );
        } );

        chartArray.numRows = 1;
        chartArray.numCols = columns.length;

        return chartArray;
    };

    var createSingleCol = function( gridObj ) {
        chartArray = [];
        var rows = xvals[ gridObj.row ];
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

        rows.map( function( row ) {
            var chart = drawChart( gridObj, row, undefined );
            chartArray.push( chart );
        } );

        chartArray.numRows = rows.length;
        chartArray.numCols = 1;

        return chartArray;
    };

    var drawChart = function( gridObj, row, col ) {
        var cellData = pullCellData( gridObj, row, col );
        var plotId = 'plot-' + [ gridObj.row, row, gridObj.col, col ].join( '' );
        var setMin = $( '#ymin' ).val();
        var setMax = $( '#ymax' ).val();

        var titleText = '';
        if( gridObj.row === undefined ) {
            titleText = gridObj.col + ' = ' + col;
        } else if( gridObj.col === undefined ) {
            titleText = gridObj.row + ' = ' + row;
        } else {
            titleText = gridObj.row + ' = ' + row + ', ' + gridObj.col + ' = ' + col;
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

        xvals[ config.seriesvar ].map( function( form ) {
            options.series.push( {
                name: form,
                data: []
            } );
        } );

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

        var c = new Highcharts.chart( options, function() {
            var $legend = $( '#legend' );
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

    return {
        init: init
    };

})();

$(function() {
    app.init();
});
