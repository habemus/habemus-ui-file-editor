// native dependencies
const proc = require('child_process')

// third-party dependencies
const gulp = require('gulp');
const electron = require('electron-prebuilt');

// browserify
const browserify = require('browserify');
const source     = require('vinyl-source-stream');
const buffer     = require('vinyl-buffer');
const brfs       = require('brfs');

// browser-sync
const browserSync = require('browser-sync');

gulp.task('demo', () => {
  // spawn electron 
  var child = proc.spawn(electron, ['demo/main.js']);
});

gulp.task('javascript:test', () => {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './test/browser/index.js',
    debug: true,
    // defining transforms here will avoid crashing your stream
    transform: [brfs]
  });

  return b.bundle()
    .on('error', function (err) {
      console.warn(err);
            this.emit('end');
    })
    .pipe(source('index.bundle.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./test/browser/'));
});

gulp.task('develop', () => {

  var watchedFiles = [
    './test/browser/**/*',
    './lib/**/*'
  ];

  gulp.watch(watchedFiles, ['javascript:test']);

  gulp.watch('./test/browser/index.bundle.js')
    .on('change', browserSync.reload);

  var bs = browserSync({
    ghostMode: false,
    port: 4000,
    server: {
      baseDir: './',
    },
    startPath: '/test/browser',
    open: true,
  });
});
