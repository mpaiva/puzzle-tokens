@import("constants.js")
@import("lib/utils.js")
@import("lib/uidialog.js")

var app = undefined
const Sketch = require('sketch/dom')
const Settings = require('sketch/settings')
const Style = require('sketch/dom').Style
const Image = require('sketch/dom').Image
const path = require('path');
const Text = require('sketch/dom').Text
const Page = require('sketch/dom').Page
const Artboard = require('sketch/dom').Artboard


class DSPreviewer {
    constructor(context) {
        this.nDoc = context.document
        this.sDoc = Sketch.fromNative(context.document)
        this.context = context
        this.UI = require('sketch/ui')

        this.messages = ""

        this.errors = []

        // init global variable
        app = this
    }

    // Tools
    logMsg(msg) {
        //log(msg)
        this.messages += msg + "\n"
    }

    logLayer(msg) {
        if (!Constants.LAYER_LOGGING) return
        log(msg)
    }


    logError(error) {
        this.logMsg("[ ERROR ] " + error)
        this.errors.push(error)
    }

    stopWithError(error) {
        const UI = require('sketch/ui')
        UI.alert('Error', error)
        exit = true
    }

    // Public methods

    run() {
        if (!this._showDialog()) return false

        var success = this._generate()

        // show final message
        if (this.errors.length > 0) {
            this._showErrors()
        } else {
            if (success) {
                this._showMessages()
            }
        }

        return true
    }

    // Internal


    _showMessages() {
        const dialog = new UIDialog("Completed", NSMakeRect(0, 0, 400, 400), "Dismiss", "", "")
        dialog.addTextViewBox("messages", "See what has been changed:", this.messages, 400)
        const result = dialog.run()
        dialog.finish()
    }

    _showErrors() {
        var errorsText = this.errors.join("\n\n")

        const dialog = new UIDialog("Found errors", NSMakeRect(0, 0, 600, 600), "Who cares!", "", "")
        dialog.addTextViewBox("debug", "", errorsText, 600)
        const result = dialog.run()
        dialog.finish()
    }

    _showDialog() {
        const dialog = new UIDialog("Generate Styles Preview", NSMakeRect(0, 0, 600, 140), "Generate")


        while (true) {
            const result = dialog.run()
            if (!result) return false
            break
        }

        dialog.finish()


        return true
    }

    _generate() {
        this.sPage = new Page({
            name: 'Styles Overview',
            parent: this.sDoc
        })

        this.sArtboard = new Artboard({
            name: 'Overview',
            parent: this.sPage,
            frame: new Rectangle(
                0, 0, 1000, 1000
            )
        })

        this._showTextStyles()


        return true
    }

    _showTextStyles() {
        var x = 25
        var y = 25
        var textExample = "Test it"

        this.sDoc.sharedTextStyles.forEach(function (sSharedStyle) {
            const sStyle = sSharedStyle.style
            const sText = new Text({
                text: textExample,
                parent: this.sArtboard,
                frame: new Rectangle(
                    x, y, 100, 20
                ),
                style: sStyle,
                sharedStyleId: sSharedStyle.id
            })

            y += 100
        }, this)
    }

    ///////////////////////////////////////////////////////////////


}
