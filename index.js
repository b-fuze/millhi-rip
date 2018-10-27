#! /usr/bin/env node

const request = require("request")
const parse = require("url")
const fs = require("fs")

// Get args
const url = process.argv[2]
const start = isNaN(process.argv[3]) || !process.argv[3] ? 1 : parseInt(process.argv[3])
const interval = 500
const maxTries = 10

if (url === undefined || !parse.parse(url).host || !url.includes("%")) {
	console.log(
`USAGE: ripper http(s)://host.tld/.../%.ext`
	)
	process.exit(1)
}

console.log(
`Start: ${ start }
Url:   ${ url }
---`
)

let isPadded = false
let padd = ("" + start).length
const halves = url.split("%")
let index = start
let attempt = 1

function exit(msg, retCode = 0) {
	console.log(msg)
	process.exit(retCode)
}

function next() {
	setTimeout(get, interval)
}

function get() {
	const imgUrl = halves[0]
		       + (isPadded ? ("" + index).padStart(padd, "0") : index)
		       + halves[1]

	console.log("Requesting: " + imgUrl)
	request({
		url: imgUrl,
		encoding: null,
	}, function(err, res, data) {
		// Get stuff
		if (res.statusCode === 403) {
			if (index === start) {
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
			return next()
		}
	})
}

get()
