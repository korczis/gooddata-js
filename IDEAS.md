# Hackathon Ideas

This is list of possible ideas for enhancenment of gooddata.js

- [x] Automatically list GD stuff
  - [x] [Projects](https://secure.gooddata.com/gdc/md/)
  - [x] [Reports](https://secure.gooddata.com/gdc/md/rq3enqarynvkt7q11u0stev65qdwpow8/query/reports and then parse out)
  - [x] report/content/definitions[-1], get it from the parsed out URI
  - [x] parse out all metrics and attribute URIs from the the report definition, get their title and identifier and populate the setup dialogs
- Layer support
  - Add layer (based on metric)
    - Own config section (color, blending, etc)
  - Remove layer
- [Add R+ tree](https://github.com/mourner/rbush)
  - Show aggregation 
    - Avg, Min, Max, Sum of something in radius from selected point
- Shapefiles
- Animations (this will be hard)
- Simple local "full-text" search
- PNG export
- Load your own data - NOW!
  - Just paste simple CSV and see it as layer
- [Configuration import/export](http://workshop.chromeexperiments.com/examples/gui/#5--Saving-Values)
- Data sources
  - List of BART stations (nice for combining)
  - List of ATMs (nice for combining)
  - Trafic info (cameras, tickets)
- Data loading optimizations
  - Use local storage
  - Stream data
  - Use double buffering
  - Use preloading
