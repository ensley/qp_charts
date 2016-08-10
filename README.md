# qp_charts
A QuickPredict plotting tool using Highcharts. Live demo on [Codepen](http://codepen.io/ensley/full/pbaxxO/).

## How to use

### Files to include
Make sure the following javascript files are attached to the bottom of the HTML page. jQuery and Bootstrap are already in use on most QLife pages, so those probably can be removed.

```html
<script src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>
<script src="https://code.highcharts.com/4.2.5/highcharts.js" charset="utf-8"></script>
<script src="scripts/exporting.js" charset="utf-8"></script>
<script src="scripts/offline-exporting.js" charset="utf-8"></script>
<script src="scripts/exporting-extension.js" charset="utf-8"></script>
<script src="scripts/qp_module.js" charset="utf-8"></script>
```

`scripts/exporting-extension.js` contains a couple of functions that work with Highcharts' `exporting.js` and `offline-exporting.js` to allow multiple charts to be exported at the same time. It's basically a plugin for a plugin for Highcharts. All three of these files are required for the full exporting functionality.

`scripts/qp_module.js` contains the app. It is well commented so that if any changes need to be made in the future, hopefully it won't be too difficult to figure out what is going on.

### Running the app

To run the app, in a new `.js` file below all the others, simply do

```javascript
$(function() {
  qp.init();
});
```

`qp` is a global variable that references the app. It has only one public function, `init`. `init` takes some options in an object as an argument.

### Options for `init`

All of the options have default values, which is why you can leave them out entirely and the app will still work. Here are the defaults:

```javascript
{
  'filepath' : '/data/qlife_mtm.json',
  'yvar' : 'pred',
  'seriesvar' : 'blendid',
  'nonplots' : ['corpid', 'datetime'],
  '$container' : $('#datatable'),
  '$buttons' : $('#xbuttons'),
  '$help' : $('#help'),
  '$infoModal' : $('#infoModal'),
  '$changeRange' : $('#change-range'),
  '$resetRange' : $('#reset-range'),
  '$ymin' : $('#ymin'),
  '$ymax' : $('#ymax'),
  '$export' : $('#export'),
  '$swap' : $('#swap'),
  '$legend' : $('#legend')
};
```

---

#### `filepath`
Path to the json file containing the prediction data.

#### `yvar`
The variable representing the predictions in the dataset. I think this is almost always `pred` in our data.

#### `seriesvar`
The name of the blend ID variable. This needs to be specified so that Highcharts knows which points should be connected into a "series".

#### `nonplots`
Any variable that are in the JSON file and are *not* `yvar`, `seriesvar`, or any of the x variables. These should be things like timestamps, corporate ID strings, and anything else unnecessary to the plots. This is how the app knows what not to try to plot.

---

The rest of the options are jQuery objects that represent different parts of the app. If you're using `qp.multiple.html`, none of these need to be changed. But if you're writing your own html, you'll need to have elements set up for all of these objects, and give them IDs so that they can be referenced correctly by the app.

#### `$container`
A `<div>` where the grid of charts will be inserted.

#### `$buttons`
A `<div>` where the group of buttons for changing the x variables will be inserted. In the demo, this is the container around "plot load", "plot srr", "plot temp".

#### `$help`
The info button that displays the help popup. This can easily be removed if desired.

#### `$infoModal`
The help popup itself. It is a [Bootstrap modal](http://getbootstrap.com/javascript/#modals). This can easily be removed if desired.

#### `$changeRange`
The "update" button for the form that changes the y axis range.

#### `$resetRange`
The "reset" button for the form that changes the y axis range.

#### `$ymin`, `$ymax`
The form inputs to change the minimum and maximum, respectively, of the y axis range.

#### `$export`
The "Export All..." button.

#### `$swap`
The "Swap Rows/Columns" button.

#### `$legend`
A `<div>` container for the legend.
