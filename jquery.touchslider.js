/*global window*/
/*
 * jQuery.touchSlider.js © 2012 MIT — The Rapportive Team <conrad@rapportive.com>
 * See https://github.com/rapportive-oss/jquery-touchslider for details.
 */
(function ($) {
    /**
     * Cubic Bezier CSS3 transitions emulator
     *
     * See this post for more details
     * http://st-on-it.blogspot.com/2011/05/calculating-cubic-bezier-function.html
     *
     * Copyright (C) 2011 Nikolay Nemshilov
     */
    function bezier(p1, p2, p3, p4) {
        // defining the bezier functions in the polynomial form
        var Cx = 3 * p1,
            Bx = 3 * (p3 - p1) - Cx,
            Ax = 1 - Cx - Bx,
            Cy = 3 * p2,
            By = 3 * (p4 - p2) - Cy,
            Ay = 1 - Cy - By;

        function bezier_x(t) {
            return t * (Cx + t * (Bx + t * Ax));
        }
        function bezier_y(t) {
            return t * (Cy + t * (By + t * Ay));
        }

        function bezier_x_der(t) {
            return Cx + t * (2 * Bx + 3 * Ax * t);
        }

        // using Newton's method to aproximate the parametric value of x for t
        function find_x_for(t) {
            var x = t,
                i = 0, z;

            while (i < 5) { // making 5 iterations max
                z = bezier_x(x) - t;
                if (Math.abs(z) < 1e-3) {
                    break; // if already got close enough
                }
                x = x - z / bezier_x_der(x);
                i += 1;
            }
            return x;
        }

        function ret(t) {
            return bezier_y(find_x_for(t));
        }
        ret.toCSS = function () {
            return "cubic-bezier(" + [p1, p2, p3, p4].join(", ") + ")";
        };
        return ret;
    }

    // Given that the user is moving the slides at a given velocity,
    // what should the bezier curve animation look like?
    //
    // In order for the user not to notice the transition to the bezier,
    // it's important that we don't move the slide; or change its velocity.
    //
    // Luckily CSS enforces the former for us, by setting the initial point
    // of a cubic to (0, 0). The latter is not hard to ensure either, as we
    // know that a bezier curve at the origin is tangent to the line between
    // its first two control points. Thus, we just have to ensure that the
    // control point lies on the line where velocity = v (or x/t = v).
    //
    // The only decision we have with regards to that control point is how
    // far from the origin it should be; this is basically a number we can
    // make up to adjust the user experience, I've called it "i" as it
    // represents how important the user's initial velocity is to the shape
    // of the final curve.
    //
    //    /|       given: x² + t² = i²
    // i / |       given: x / t = v
    //  /  | x     => x = sqrt(i² * v²/(1 + v²))
    // ,___|
    //   t
    //
    // As we want the animation to finish at the end with 0 velocity, we
    // are forced to put the second intermediate control point with an x
    // coordinate of 1 (the final control point is at (1, 1) by definition),
    // so the only other choice we have for the shape of our curve is how
    // far along the t axis to put the second control point.
    //
    // At the moment I'm using 't' for that, because it seems to result in
    // consistently smooth-feeling curves; but it's just an arbitrary choice.
    //
    // http://cubic-bezier.com/ is useful for getting an intuitive feel for
    // this. Also note that webkit doesn't support "bouncey" transitions
    // (with points outside the (0, 0) <-> (1, 1) range) as of iOS 5.
    function bezier_for_velocity(v) {
        var importance = 0.5,
            x = (v < 0 ? -1 : 1) * Math.sqrt(importance * importance * (v * v / (1 + v * v))),
            t = x / v,
            sameness = t;

        return bezier(t, x, sameness, 1.0);
    }

    $.fn.touchSlider = function () {
        var x, t, initial_x,
            previous_x, previous_t,
            $this = this,
            slides = this.find(".slides"),
            initial_t, initial_slide,
            current_offset = 0, initial_offset,
            target_offset = 0,
            animation = {},
            slide_width = this.width(), last_slide = this.find(".slide").length - 1,
            left_edge = 0,
            default_duration = 500,
            right_edge = slide_width * last_slide;

        this.css({
            'overflow': 'hidden'
        });
        slides.css({
            'width': (slide_width * this.find(".slide").length) + 'px',
            '-webkit-transition-property': '-webkit-transform',
            '-webkit-transform': 'translate3D(0, 0, 0)'
        });
        // Force slides into texture buffers on the iPad
        slides.find(".slide").css({
            '-webkit-transform': 'translate3D(0, 0, 0)'
        });

        this.bind('touchstart', function (e) {
            e = e.originalEvent || e;

            if (e.touches.length !== 1) {
                return;
            }

            // Allow the user to interrupt our animation.
            var t = new Date() - animation.start;
            if (animation && t < animation.duration) {
                window.clearTimeout(animation.timeout);
                current_offset += animation.bezier(t / animation.duration) * (target_offset - current_offset);
            } else {
                current_offset = target_offset;
            }

            slides.css({
                // Remove the delay on animation for instant finger feedback
                '-webkit-transition-duration': '0s',
                '-webkit-transform': 'translate3D(' + (0 - current_offset) + 'px, 0, 0)'
            });

            initial_offset = current_offset;
            initial_slide = Math.floor(target_offset / slide_width);
            initial_x = previous_x = x = e.touches[0].clientX;
            initial_t = previous_t = t = new Date();

        }).on('touchmove', function (e) {
            e = e.originalEvent || e;

            if (e.touches.length !== 1) {
                return;
            } else {
                e.preventDefault();
            }

            previous_x = x;
            previous_t = t;
            x = e.touches[0].clientX;
            t = new Date();

            current_offset = initial_offset + (initial_x - x);

            // iOS-like halved velocity when dragging beyond the edge
            if (current_offset < left_edge) {
                current_offset = current_offset / 2;
            } else if (current_offset > right_edge) {
                current_offset = right_edge + (current_offset - right_edge) / 2;
            }

            slides.css({
                '-webkit-transform': 'translate3D(' + (0 - current_offset) + 'px, 0, 0)'
            });

        }).on('touchend', function (e) {
            var target_slide, target_distance, velocity, final_destination;

            final_destination = current_offset;

            // Move up to half an extra slide in the direction of current motion.
            // TODO: this will feel much nicer once we have bouncing.
            if (Math.abs(t - previous_t) > 1) {
                final_destination += Math.min(slide_width / 2, Math.max(-slide_width / 2,
                                        default_duration * (previous_x - x) / (t - previous_t)
                                     ));
            }

            target_slide = Math.round(final_destination / slide_width);

            if (target_slide < 0) {
                target_slide = 0;
            } else if (target_slide > last_slide) {
                target_slide = last_slide;
            }

            target_distance = current_offset - target_slide * slide_width;

            // avoid division by zero
            if (Math.abs(x - previous_x) < 1 || Math.abs(t - previous_t) < 1) {
                velocity = 0.1;
            } else {
                velocity = ((x - previous_x) / (t - previous_t)) * (default_duration / target_distance);
            }

            $this.trigger('slideTo', {slide: target_slide, bezier: bezier_for_velocity(velocity)});

        }).on('slideTo', function (e, opts) {
            target_offset = opts.slide * slide_width;

            animation = {
                slide: opts.slide,
                // webkit doesn't perform the transition if the duration is 0 and the slider is offscreen
                duration: Math.max(typeof opts.duration === 'undefined' ? default_duration : opts.duration, 1),
                start: new Date(),
                bezier: opts.bezier || bezier_for_velocity(0.1)
            };

            slides.css({
                '-webkit-transition-timing-function': animation.bezier.toCSS(),
                '-webkit-transition-duration': animation.duration + 'ms',
                '-webkit-transform': 'translate3D(' + (0 - target_offset) + 'px, 0, 0)'
            });

            $this.trigger('slidingTo', animation);
            animation.timeout = window.setTimeout(function () {
                $this.trigger('slidTo', animation);
            }, animation.duration);

        });
        return this;
    };
}(window.jQuery || window.Zepto));
