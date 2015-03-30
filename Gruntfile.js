module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            options: {
                separator: ";\n",
            },
            dist: {
                src: [
                    'src/js/d3.geom.js', 
                    'src/js/queue.v1.min.js', 
                    'src/js/edgeFx.js', 
                    'src/js/plugins/default.js'
                ],
                dest: 'dist/js/edgeFx.dist.js',
            },
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'dist/js/edgeFx.dist.js',
                dest: 'dist/js/edgeFx.dist.min.js'
            }
        },

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.loadNpmTasks('grunt-contrib-uglify');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat', 'uglify']);

};