var fs = require('fs');

const args = process.argv.slice(2)
var pathToLess1 = args[0]
var pathToLess2 = args[1]
var pathToJSON = args[2]
var lessVars = {}
var sketchRules = []
var parseOptions = null
var _lookups = {}

/////////////////////////////////////////////
console.log("Started")

if(!initPaths()) process.exit(0)

var strSrcLess = loadLessFromFiles(pathToLess1,pathToLess2)
if(null==strSrcLess) process.exit(-1)

var strLess = injectTokensIntoLess(strSrcLess)

loadLessVars(strLess)    

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function initPaths(){
    if(undefined==pathToLess1 || undefined==pathToLess2 ){
        console.log("nsconvert.js PATH_TO_LESS_FILE1 PATH_TO_LESS_FILE2(OPT) PATH_TO_JSON_FILE")
        return false
    }
    if(undefined == pathToJSON){
        pathToJSON = pathToLess2
        pathToLess2 = undefined
    }

    return true   
}

function injectTokensIntoLess(srcData){
    var lessLines = srcData.split("\n")
    var newData = ""

    lessLines.forEach(function(line){
        var found = line.match(/@{1}([\w-]*)\w{0,};/)
        if(null!=found && found.length>=1){
            var token = found[1]
            var commentPos = line.indexOf("//")
            if(commentPos>0){
                line = line.substring(0,commentPos)
            }
            line += " //!"+token+"!"
        }
        newData += line + "\n"
    })

    return newData
}

function loadLessFromFiles(fileName1,fileName2){
    console.log("Read LESS: running...")
    
    var data = ''
    const data1 = fs.readFileSync(fileName1, 'utf8');
    if(null==data1){
        console.log("Can't open file by path:"+fileName1)
        return null
    }
    data = data + data1;
    if(fileName2!=undefined){
        data = data + "\n"+fs.readFileSync(fileName2, 'utf8');
    }

    return data
}

function loadLessVars(data){
  
    var less = require("/usr/local/lib/node_modules/less")   


    var options1 = { 
        async: false,
        fileAsync: false
    }

    try {
        less.parse(data, options1, function (err, root, imports, options) {
            parseOptions = options
            //console.log(options.pluginManagermixin)
            if(undefined!=err) console.log(err)
            
            var evalEnv = new less.contexts.Eval(options);
            var evaldRoot = root.eval(evalEnv);
            var ruleset = evaldRoot.rules;

            ruleset.forEach(function (rule) {                            
                if(rule.isLineComment){
                    return
                }else if (rule.variable === true) {                
                    var name;
                    name = rule.name.substr(1);					

                    var value = rule.value;
                    lessVars[name] = value.toCSS(options);				

                    console.log(name+" : "+value.toCSS(options))
                }else{                                 
                    parseSketchRule(rule,null,[])                                      
                }
            });
            //console.log("----------------------------------------")
            //console.log(lessVars)
            
            // completed
            //saveData(lessVars,pathToJSON)
            saveData(sketchRules,pathToJSON)
            console.log("Completed")
        });
    } catch ( e ) {
        console.log("Failed to parse LESS with error message:\n")
        console.log(e.message)
        process.exit(-1)
    }

    console.log(sketchRules)

    
    console.log("Read LESS: done")
}


function parseSketchRule(rule,elements,path){
    //console.log("----------------- parseSketchRule -----------------------")

    // save info about enabled mixins to ignore them
    if(rule._lookups && Object.keys(rule._lookups).length>0){
        Object.keys(rule._lookups).forEach(function(s){
            _lookups[s.trim()] = true
        })
       console.log("SAVED MIXINS")
       console.log(_lookups)
    }

    if(null!=elements){ 
        var foundMixin = false       
        elements.forEach(function (el) { 
            path = path.concat([el.value])
            if(el.value in _lookups){
                foundMixin = true
                console.log("FOUND MIXIN!")  
                return
            }
        })
        if(foundMixin) return
    }else{
        if(rule.selectors!=null && rule.selectors.length>0){
            rule.selectors.forEach(function (sel) {
                parseSketchRule(rule,sel.elements,path)
            })
            return
        }
    }
    ///
    if( rule.rules && !(rule.rules[0].rules)){
        saveSketchRule(rule,path)
    }else if( rule.rules ){
        rule.rules.forEach(function (oneRule) { 
            parseSketchRule(oneRule,null,path)
        })
    }
}

function saveSketchRule(rule,path){
    //var sketchPath = path.join("/")
    //console.log(sketchPath)
    //sketchPath = sketchPath.replace(/(\.)/g, '').replace(/^\./,'')
    
    const sketchRule = {
        path: path,
        props: {
            __lessTokens:{}
        }
    }
    rule.rules.forEach(function (oneRule,index) { 
        if(oneRule.isLineComment) return
        var value = oneRule.value.toCSS(parseOptions);	
        if('box-shadow'==oneRule.name){
            const shadowValues = oneRule.value.value.map(function(v){                        
                if(v.unit && v.unit.numerator){
                    return String(v.value) + String((v.unit && v.unit.numerator &&  v.unit.numerator.length>0)? v.unit.numerator[0]:"")
                }else if (v.rgb){
                    return String(v.value)
                }                
            })
            value = shadowValues.join(" ")       
        }else{
           // console.log(oneRule)
        }

        // get token from rule comment
        var token = "-"
        var nextRule = rule.rules[index+1]
        if(nextRule!=null && nextRule.isLineComment){
            var res = nextRule.value.match(/!{1}([\w-]*)!{1}/)
            if(null!=res && null!=res[1]){
                token = '@'+res[1]
            }
        }


        sketchRule.props[String(oneRule.name)] = value
        sketchRule.props.__lessTokens[token] = true
    })
    sketchRules.push(sketchRule)
}



function saveData(data,pathToJSON){   
    var json = JSON.stringify(data,null,'    ')
    fs.writeFileSync(pathToJSON, json, 'utf8');

    return true
}