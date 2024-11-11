const path = require("path");

module.exports = {
	mode: "production",
	entry: {
		background: path.resolve(__dirname, "src/background/background.js"),
		content: path.resolve(__dirname, "src/content/content.js"),
		options: path.resolve(__dirname, "options.js"),
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].bundle.js",
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
				},
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
		],
	},
};
