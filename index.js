const AWS = require('aws-sdk');
const express = require('express');
const cors = require('cors')
const bodyparser = require('body-parser');
const fileUpload = require('express-fileupload');
const swaggerUi = require('swagger-ui-express'), swaggerDocument = require('./swagger.json');

const app = express();
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.use(cors());
app.use(fileUpload({
	createParentPath: true,
	safeFileNames: true,
	preserveExtension: true,
	uriDecodeFileNames: true
}));


const defaultBucket = 'elasticbeanstalk-us-east-1-066902780383';  // replace with secret
const defaultPrefix = 'bobo/';   // replace with secret

const s3 = new AWS.S3({
	accessKeyId: 'AKIAQ7E5XNHPR3CML5EW',    // replace with secret
	secretAccessKey: 'GuizUyGBHe94R0EMvQA0YDKB8FvFJQoRBBgkrt1P',    // replace with secret
	Bucket: `${defaultBucket}`
});


// This function lists items in s3 bucket
const s3list = function(params) {
	return new Promise((resolve, reject) => {
		s3.listObjects(params, function(err, data) {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

// This function for upload file to s3 bucket
const s3upload = function(params) {
	return new Promise((resolve, reject) => {
		s3.createBucket(params.Bucket, function() {
			s3.putObject(params, function(err, data) {
				if (err) {
					reject(err)
				} else {
					resolve(data);
				}
			});
		});
	});
}

const s3download = function(params, bucketName) {
	return new Promise((resolve, reject) => {
		s3.getObject(params, function(err, data) {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

const s3delete = function(params, bucketName) {
	return new Promise((resolve, reject) => {
		s3.deleteObject(params, function(err, data) {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
};



const getFileNameFromKey = function(s3key) {
	return s3key.slice(s3key.lastIndexOf('/') + 1)
}

const cleanedList = function(bucket, s3data) {
	if (s3data.Contents.length === 0) {
		return ({});
	} else {
		let cleanedContents = new Array();
		for (const singleObject of s3data.Contents) {
			const filename = getFileNameFromKey(singleObject.Key);
			if (filename !== '') {
				cleanedContents.push({ ObjectKey: singleObject.Key, ObjectName: filename, Bucket: bucket });
			}
		}
		return cleanedContents;
	}
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/v1/s3imageapp', (req, res) => {
	const paramsList = {
		Bucket: `${defaultBucket}`,
		Delimiter: '/',
		Prefix: `${defaultPrefix}`
	};
	s3list(paramsList).then(function(result) {
		res.status(200).send(cleanedList(paramsList.Bucket, result));
	}).catch(function() {
		res.status(500).send({ Message: `Could not list files in bucket` });
	});
});

app.post('/v1/s3imageapp', (req, res) => {

	if (!req.files) {
		res.status(500).send({ Message: `No file attached` });
	} else {

		const fileName = req.files.file.name;
		if (!fileName.endsWith('.jpg')) {
			res.status(500).send({ Message: `File must be a .jpg file` });
		} else {

			const fileName = req.files.file.name;
			const fileContent = Buffer.from(req.files.file.data, 'binary');
			const paramsUpload = {
				Bucket: `${defaultBucket}`,
				Key: `${defaultPrefix}${fileName}`,
				Body: fileContent
			};
			s3upload(paramsUpload).then(function() {
				res.status(201).send({ Message: `Successfully uploaded '${fileName}' to bucket` });
			}).catch(function(result) {
				console.error(result);
				res.status(500).send({ Message: `Unsuccessfully uploaded '${fileName}' to bucket` });
			});
		}
	}

});

app.delete('/v1/s3imageapp/file/:objectKey', (req, res) => {
	const paramsDelete = {
		Bucket: `${defaultBucket}`,
		Key: `${req.params.objectKey}`
	};
	s3delete(paramsDelete).then(function(result) {
		res.status(202).send({ Message: `Successfully deleted '${paramsDelete.Key}' from bucket` });
	}).catch(function(result) {
		res.status(500).send({ Message: `Unsuccessfully deleted '${paramsDelete.Key}' from bucket` });
	});
});

app.get('/v1/s3imageapp/file/:objectKey', (req, res) => {
	const paramsDownload = {
		Bucket: `${defaultBucket}`,
		Key: `${req.params.objectKey}`
	};
	const localFileName = paramsDownload.Key.slice(paramsDownload.Key.lastIndexOf('/') + 1);
	s3download(paramsDownload).then(function(result) {
		res.attachment(localFileName);
		res.send(result.Body);
	}).catch(function(result) {
		res.status(500).send(`Unsuccessfully downloaded '${localFileName}' from bucket`);
	});
});

const server = app.listen(3333, () => {
	const port = server.address().port;
	console.log(`Express listening on port ${port}`)
});

module.export = server;




