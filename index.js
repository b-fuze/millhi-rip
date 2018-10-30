#! /usr/bin/env node

const request = require("request")
const parse = require("url")
const fs = require("fs")

// Get args
const url = process.argv[2]
const interval = 500
const maxTries = 10

if (url === undefined || !parse.parse(url).host || !url.includes("%")) {
	console.log(
`USAGE: ripper http(s)://host.tld/.../%.ext [START] [END] [--no-pad]`
	)
	process.exit(1)
}

let noSkip = false
let noPadding = false
let isPadded = false
const halves = url.split("%")
const numArgs = []
let index = start = 1
let end = 0
let padd = ("" + start).length
let attempt = 1

for (const arg of process.argv) {
	if (arg === "--no-skip") {
		noSkip = true
	} else if (arg === "--no-pad") {
		noPadding = true
	} else if (/^\d+$/.test(arg)) {
		numArgs.push(parseInt(arg, 10))
	}
}

// Set number args
0 in numArgs && (index = start = numArgs[0], padd = ("" + start).length)
1 in numArgs && (end = numArgs[1])

console.log(
`Start: ${ start }
End:   ${ end }
Url:   ${ url }
---`
)

const files = {}

if (!noSkip) {
	fs.readdirSync(process.cwd()).forEach(file => (files[file] = 1))
}

function exit(msg, retCode = 0) {
	console.log(msg)
	process.exit(retCode)
}

function next() {
	setTimeout(get, interval)
}

function imgName(index) {
	return (isPadded ? ("" + index).padStart(padd, "0") : index)
	       + halves[1]
}

function get() {
	let img = imgName(index)

	if (!noSkip) {
		while (files[img]) {
			console.log("Skip previously downloaded " + img)

			index++
			img = imgName(index)
		}
	}

	const imgUrl = halves[0] + img

	console.log("Requesting: " + imgUrl)
	request({
		url: imgUrl,
		encoding: null,
	}, function(err, res, data) {
		// Get stuff
		if (res.statusCode === 403) {
			if (index === start && !noPadding) {
				if (!isPadded) {
					// Switch to padding
					console.log("Reattempt with padding")
					isPadded = true
					return next()
				} else {
					// Increase padding
					attempt++
					padd++;

					if (attempt > maxTries) {
						exit("Exhausted max attempts", 1)
					} else {
						return next()
					}
				}
			} else {
				// Done
				console.log("Skip " + index);

				index++;
				return next();
			}
		} else if (res.statusCode === 200) {
			const fileName = index + halves[1]
			fs.writeFileSync(fileName, data, {encoding: "binary"})

			index++;

			if (index > end) {
				exit("Reached end: " + end)
			}

			return next()
		}
	})
}

get()
