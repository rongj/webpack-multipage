var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var glob = require('glob');

var env = process.env.NODE_ENV;

// 使用typescript编译开发发布
var isbuild = env.indexOf('build') > -1

var jsType = env.indexOf('ts') > -1 ? 'ts' : 'js'

var config = {};

var output = isbuild ? {
	path: path.resolve(__dirname, 'dist'),
	publicPath: '', 
	filename: 'js/[name].js?[chunkhash:8]'
} : {
	path: path.resolve(__dirname, 'debug'),
	publicPath: '', 
	filename: 'js/[name].js'
};

var extractCss = isbuild ? new ExtractTextPlugin('css/[name].css?[chunkhash:8]') : new ExtractTextPlugin('css/[name].css');
var commonsJs = isbuild ? new webpack.optimize.CommonsChunkPlugin({
	name: 'vendor', 
	filename: 'js/vendor.js?[chunkhash:8]'
}) : new webpack.optimize.CommonsChunkPlugin({
	name: 'vendor', 
	filename: 'js/vendor.js'
});

var hotModule = new webpack.HotModuleReplacementPlugin();
var uglifyJs = new webpack.optimize.UglifyJsPlugin({
	beautify: false,
	comments: false,
	compress: {
		warnings: false,
		// 删除console
		drop_console: true
	}
});

var devServer = isbuild ? {} : {
	contentBase: path.resolve(__dirname),
	compress: true,
	historyApiFallback: true,
	hot: true,
	inline: true,
	host: 'localhost', 
	port: 8088
};

// 入口文件
var entries = (function() {
	var jsDir = path.resolve(__dirname, 'src/static/'+jsType+'/page');
	var entryFiles = glob.sync(jsDir + '/*.'+jsType);
	var map = {};

	entryFiles.forEach(function(filePath) {
		var filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'));
		map[filename] = filePath;
	});
	return map;
})();


var htmlPages = (function() {
	var artDir = path.resolve(__dirname, 'src/views');
	var artFiles = glob.sync(artDir + '/*.html');
	var array = [];

	artFiles.forEach(function(filePath) {
		var filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'));

		array.push(new HtmlWebpackPlugin({
			template: path.resolve(__dirname, 'src/views/'+filename+'.html'),
			filename: filename + '.html',
			chunks: ['vendor', 'main', filename],
			chunksSortMode: function(chunk1, chunk2) {
				var order =  ['vendor', 'main', filename];
				var order1 = order.indexOf(chunk1.names[0]);
				var order2 = order.indexOf(chunk2.names[0]);
				return order1 - order2;
			},
			minify: {
				removeComments: isbuild ? true : false,
				collapseWhitespace: isbuild ? true : false
			}
		}));
	});
	return array;
})();

config = {
	entry: Object.assign(entries, {
			main: path.resolve(__dirname, 'src/main.'+jsType)
		}),
	output: output,
	devServer: devServer,
	module: {
		rules: [
			{
				test: /\.scss$/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
				use: ExtractTextPlugin.extract({
					use: [ 'css-loader', 'sass-loader' ]
				})
			},
			{ 
				test: /\.css$/, 
				use: ['style-loader', 'css-loader'],
				use: ExtractTextPlugin.extract({
					use: [{
						loader: 'css-loader',
						options: {
							minimize: isbuild ? true : false
						}
					}]
				})
			},
			{
				test: /\.(png|jpg|gif)$/,
				use: ['url-loader?limit=8192&name=img/[name].[ext]?[hash:16]']
			},
			{
				test: /\.(eot|woff|ttf)$/,
				use: ['url-loader?limit=8192&name=font/[name].[ext]?[hash:16]']
			},
			{ 
				test: /\.js$/, 
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['es2015'],
						plugins: ['transform-runtime']
					}
				}, 
				exclude: /node_modules/
			},
			{
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            },
			{ 
				test: /\.(html|tpl)$/, 
				use: ['html-loader'] 
			}
		]
	},
	resolve: {
		// require时省略的扩展名，如：require('module') 不需要module.js
		extensions: ['.art', '.js', '.css'],
		// 别名，可以直接使用别名来代表设定的路径以及其他
		alias: {
			views: path.resolve(__dirname, './src/views'),
			static: path.resolve(__dirname, './src/static'),
			components: path.resolve(__dirname, './src/components')
		}
	},
	plugins: [
		new webpack.DefinePlugin({
		    'process.env': {
		        NODE_ENV: JSON.stringify(env)
		    }
		}),
		extractCss,
		commonsJs
	].concat(htmlPages)
};

if(isbuild) {
	config.plugins.unshift(uglifyJs)
} else {
	config.plugins.unshift(hotModule);
}

module.exports = config;