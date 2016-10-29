'use strict';

// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var htmlmin = require('gulp-htmlmin');
var imagemin = require('gulp-imagemin');
var del = require('del');
var ejs = require("gulp-ejs");
var pngquant = require('imagemin-pngquant');
var browserSync = require('browser-sync');
var runSequence = require('run-sequence');
var bundle = require('gulp-bundle-assets');
var sitemap = require('gulp-sitemap');
var sitemapPages = require('./src/sitemap-pages.json');

//Added for Sitemap
var fs = require('fs');
var path = require('path');
var map = require('map-stream');
var vfs = require('vinyl-fs');
var extraSitemap = require('./src/sitemap-pages.json');
var pagesArr = [];

//add pages from json to array
gulp.task('extra-sitemap',function(){
  extraSitemap.extraPagesArr.forEach(function(args) {
    pagesArr.push(args);
  });
});

//add all build html files we want to log function
gulp.task('no-index',['extra-sitemap'], function(done) {
  vfs.src(['build/**/*.html', '!build/partials/**', '!build/controllers/**'])
    .pipe(map(log))
    .on('end', done);;
});

//get the file path and check contents for noindex nofollow
function log(file, cb) {
  fs.readFile(file.path, 'utf-8', function(err, contents) { 
    if (contents.indexOf('noindex') != -1) {
      var x = file.path;
        pagesArr.push('!' + path.relative(process.cwd(),x));
      } 
  }); 
  cb(null, file);
};

//build sitemap
gulp.task('sitemap',['no-index'], function () {
  //console.log(pagesArr);
    gulp.src(pagesArr)
        .pipe(sitemap({
            siteUrl: 'https://www.thecapcitycollective.com'
        }))
        .pipe(gulp.dest('./build'));
});
//////end sitemap/////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////
// Delete Build folder
gulp.task('clean', function() {
  return del(['./build']);
});

gulp.task('generate',function(){
	gulp.src("./src/**/*.html")
    .pipe(ejs())
    .pipe(gulp.dest("./build"));
});

//////////////////////////////////////////////////////////////////
// Browser-Sync
gulp.task('browser-sync', function() {
    browserSync.init({
        reloadDebounce: 5000,
        server: {
            baseDir: './build'
        }, 
        port: 8000,
        tunnel: false // only need to enable this if with a device not on the same wifi - crashes often so off by default
    });

     gulp.watch(['src/**/*.html'], function () {
        runSequence(
            'generate',
            browserSync.reload
        );
    });
});

// Minify Images
gulp.task('imagemin', function() {
  return gulp.src(['./src/assets/images/*','./src/assets/images/**/*'])
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest('./build/assets/images/'));
});

// minify html
gulp.task('minify-html', function() {
  return gulp.src(['build/**/*.html', '!build/partials/**'])
    .pipe(htmlmin({collapseWhitespace: true, minifyJS : true, minifyCSS: true , removeComments: true}))
    .pipe(gulp.dest('build'));
});


// Lint Task
gulp.task('lint', function() {
    return gulp.src('src/assets/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Compile Our Sass
gulp.task('sass', function () {
  return gulp.src('src/assets/sass/**/*.scss')
    .pipe(sass({includePaths: ['./node_modules'], outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(gulp.dest('build/assets/stylesheets/'))
    .pipe(browserSync.stream({match: '**/*.css'}));

});

//////////////////////////////////////////////////////////////////
// videoCopy
gulp.task('videoCopy', function() {
  return gulp.src('./src/assets/videos/*')
    .pipe(gulp.dest('./build/assets/videos/'))
    .pipe(browserSync.stream({match: 'assets/videos/**'}));
});

//////////////////////////////////////////////////////////////////
// Concatenate & Minify JS

// Ignores files used for bundle task
gulp.task('globalScripts', function() {
    return gulp.src(['src/assets/js/global-scripts/*.js'])
        .pipe(concat('global.js'))
        .pipe(gulp.dest('build/assets/javascript'))
        .pipe(rename('global.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('build/assets/javascript'))
        .pipe(browserSync.stream({match: '**/**/*.js'}));
});

// Uses bundle.config.js to find npm js files and bundles/uglifys them
gulp.task('bundleScripts', function() {
  return gulp.src('src/assets/js/global-admin/bundle.config.js')
    .pipe(bundle())
    .pipe(rename('global-admin.js'))
    .pipe(gulp.dest('build/assets/javascript'));
});

gulp.task('scripts', ['globalScripts', 'bundleScripts']);

//////////////////////////////////////////////////////////////////
// Master Tasks
// Default Task <-- Make into Dev build vs. Prod build
gulp.task('default', function(callback) {
  runSequence('clean',
              ['lint', 'sass', 'scripts', 'imagemin', 'videoCopy', 'generate'],
              'minify-html',
              'sitemap',
              callback);
});

gulp.task('netlify', function(callback) {
  runSequence('clean',
              ['lint', 'sass', 'scripts', 'imagemin', 'videoCopy', 'generate'],
              'minify-html',
              'sitemap',
              callback);
});


//////////////////////////////////////////////////////////////////
// Watch & Serve
// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/assets/js/**/*.js', ['lint', 'scripts']);
    gulp.watch('src/assets/sass/**/*.scss', ['sass']);
    //gulp.watch('src/assets/js/search/*.js', ['webpack:dev']);
    gulp.watch('src/**/*.html');
    gulp.watch('src/**/*.js');
    gulp.watch('node_modules/capbox/js/bin/*.js', ['scripts']);
    gulp.watch('node_modules/capbox/sass/**/*.scss', ['sass']);
});

gulp.task('serve', function(callback) {
  runSequence('clean',
              ['lint', 'sass', 'scripts', 'imagemin', 'videoCopy', 'generate', 'watch'],
              'browser-sync',
              'minify-html',
              'sitemap',
              callback);
});


