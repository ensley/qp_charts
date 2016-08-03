/**
 * Create a global getSVG method that takes an array of charts as an argument. The SVG is returned as an argument in the callback.
 */
Highcharts.getSVG = function ( charts, numRows, numCols, options, callback ) {
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
