const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: path.resolve(__dirname, "../src/index.js"),
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "../dist"),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "./template.html"),
        }),
    ],
    mode: "development",
};
