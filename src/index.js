// Import the necessary modules
const express = require('express');
const app = express();
const config = require('../config.json');
const recycling_codes = require('../recycling-codes.json');
const { Sequelize, DataTypes } = require('sequelize');

// Enable CORS for all requests
const cors = require('cors');
app.use(cors());

// Create a Sequelize instance connected to the database as specified in the config.json file
const sequelize = new Sequelize(config.databaseURL);

// Define the Product model which maps to a table in our database for product information
const Product = sequelize.define('Product', {
	'productId': {
		type: DataTypes.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	'barcode': {
		type: DataTypes.STRING,
	},
	'productName': {
		type: DataTypes.STRING,
	},
	'productDescription': {
		type: DataTypes.TEXT,
	},
	'packagingType': {
		type: DataTypes.STRING,
	},
	'recyclingCode': {
		type: DataTypes.INTEGER,
	},
	'isRecyclable': {
		type: DataTypes.BOOLEAN,
	},
	'productScore': {
		type: DataTypes.INTEGER,
	},
});

// new table with recommendations for every product to recommend a few other products
const Recommendation = sequelize.define('Recommendation', {
	'recommendationId': {
		type: DataTypes.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	'productId': {
		type: DataTypes.INTEGER,
	},
	'recommendation': {
		type: DataTypes.STRING,
	},
});

// Middleware to serve static files (e.g., images, CSS files) from the 'public' directory
app.use(express.static('public'));

// Endpoint to get product information by barcode
app.get('/v1/products/:barcode', async (req, res) => {
	const barcode = req.params.barcode;

	// Check if the product with the given barcode exists in the database
	try {
		const product = await Product.findOne({
			where: {
				barcode: barcode,
			},
		});

		// If the product exists, return its details
		if (product) {
			const recommendations = await Recommendation.findAll({
				where: {
					productId: product.productId,
				},
			});
			// array of recommendation barcode IDs
			var recommendationBarcodes = [];
			for (var i = 0; i < recommendations.length; i++) {
				const recommendationID = recommendations[i].recommendation;
				const recommendation = await Product.findOne({
					where: {
						productID: recommendationID,
					},
				});
				// find in recycling_codes.json the material that matches the recycling code, array of objects with num value
				const material = recycling_codes.find(o => o.num === product.recyclingCode);
				const materialRes = !material ? null : {
					'code': product.recyclingCode,
					'type': material.type,
					'examples': material.examples,
				};
				const recommendationOutput = {
					productID: recommendation.productID,
					productName: recommendation.productName,
					productDescription: recommendation.productDescription,
					productImage: `${config.url}/products/${recommendation.barcode}.png`,
					packagingType: recommendation.packagingType,
					material: materialRes,
					isRecyclable: recommendation.isRecyclable,
					recommendations: [],
					productScore: recommendation.productScore,
				};
				recommendationBarcodes.push(recommendationOutput);
			}

			// find in recycling_codes.json the material that matches the recycling code, array of objects with num value
			const material = recycling_codes.find(o => o.num === product.recyclingCode);
			const materialRes = !material ? null : {
				'code': product.recyclingCode,
				'type': material.type,
				'examples': material.examples,
			};
			res.json({
				productID: product.productID,
				productName: product.productName,
				productDescription: product.productDescription,
				productImage: `${config.url}/products/${product.barcode}.png`,
				packagingType: product.packagingType,
				material: materialRes,
				isRecyclable: product.isRecyclable,
				recommendations: recommendationBarcodes,
				productScore: product.productScore,
			});
		}
		else {
			// If the product does not exist, return an appropriate error message
			res.status(404).send('Product with the given barcode does not exist');
		}
	}
	catch (error) {
		// Handle any other errors that occur during the process
		res.status(500).send('An error occurred while retrieving the product information');
		console.log(error);
	}
});

// Sync the Sequelize instance with the database and create the tables if they do not exist
sequelize.sync().then(() => {
	console.log('Database and tables created');
});

// Start the server and listen on the port specified in the config.json file
app.listen(config.port, () => {
	console.log(`Backend server is running on port ${config.port}`);
});