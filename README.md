jQuery.touchSlider.js is yet-another touch-sensitive carousel jQuery plugin.
You can use jQuery.touchSlider.js with Zepto.js too :).

Usage
=====

Basic example ([open on your iPhone/iPad](http://bit.ly/tslider)):

```html
<script src="http://code.jquery.com/jquery-latest.js"></script>
<script src="https://raw.github.com/rapportive-oss/jquery-touchslider/master/jquery.touchslider.js"></script>

<div class="slider" style="width: 800px; font-size: 0">
    <div class="slides">
        <img class="slide" src="http://www.placehold.it/800x600/222&text=ONE">
        <img class="slide" src="http://www.placehold.it/800x600/555&text=TWO">
        <img class="slide" src="http://www.placehold.it/800x600/888&text=THREE">
        <img class="slide" src="http://www.placehold.it/800x600/AAA&text=FOUR">
    </div>
</div>

<script>
    $(function () {
        $('.slider').touchSlider();
    });
</script>
```

DOM
===

jQuery.touchSlider expects your DOM to have the specific strucuture outlined above.
The `<div class="slider">` should have a width set (either in a CSS file, or inline),
and should contain only `<div class="slides">`.

You should set up `<div class="slides">` so that when it's moved sideways in incremements
of the slider width (e.g. 800px), a new slide appears; but feel free to have extra
DOM in amoungst the slides if you need.

Events
======

There are three events supported:

```javascript
// Slide to the given slide.
$('.slider').trigger('slideTo', {
    slide: 3,      // Which slide to move to.
    duration: 0,   // The default is 500.
});

// Before slide-transition
$('.slider').on('slidingTo', function (e, animation) {
    alert("Slide " + animation.slide + " is about to be shown.");
});

// After slide-transition
$('.slider').on('slidTo', function (e, animation) {
    alert("Slide " + animation.slide + " is now fully visible.");
});
```

Implementation
==============

It exists not because there aren't many alternatives, but because it uses some fun
techniques to get fast responsive scrolling.

### Graphics hardware pre-loading

Every slider worth its salt is already doing this, but here are the details:

When the slider is initialized, we push both the slides container, and each slide
individually into the texture buffer. If you don't put the slides container there, then
the first time the user touches the slider, they'll see graphical glitches; and if you
don't put each slide individually then they'll see graphical glitches the first time a new
slide is shown.

```css
.slides, .slides .slide {
    -webkit-transform: translate3D(0, 0, 0);
}
```

### CSS transitions

The most important part of implementing a slider like this is getting the behaviour right
when the user lifts their finger from the screen. Before that point, you can just update
the `-webkit-transform` in response to finger movement; after that point you are on your
own.

There are two ways to do this, either try to calculate a custom function in javascript, or
use the built-in CSS smoothing functions.  The problem with calculating a custom function
is that it's very hard to make it smooth enough that the user cannot notice each frame of
your animation, the problem with CSS smoothing functions seems to mainly be "that's not
how Apple does it", but I can live with that :).

### Curve joining

There's actually a second problem with using CSS smoothing functions, which is much more
subtle. If you just use a random cubic-bezier (say the built in `ease` transition), then
there's an unpleasant discontinuity when the finger is lifted.

This is because the user is moving the slide at a particular velocity, and the Bezier
curve also starts with a particular velocity; and if those two don't match up, then it
creates a noticeable "bump" as you transition between manual control and animation.

Thankfully this is possible to fix by measuring the velocity at which the user is moving the
slide and calculating a custom cubic-bezier easing function that starts with the correct
velocity. Mathematicians call this [C(1) continuity](http://en.wikipedia.org/wiki/Smooth_function#Parametric_continuity).

In CSS, the gradient of the Bezier curve is the velocity of the transition, and the
gradient at the start of a curve `cubic-bezier(a, b, c, d)` is `a / b`; so when choosing
the curve, we make sure that `a / b` has the correct value.
![Bezier function comparison](http://code.rapportive.com/jquery-touchslider/img/continuity.svg)

We also set `d` equal to 1,
which ensures the transition stops smoothly. The only other constraints on the Bezier
curve choice is that they should feel natural and consistent, i.e. no matter what the
initial velocity, the curve should feel good; and at all velocities the user should feel
that the curves are similar.

### Interruptable animations

It's vital when you are animating a transition that the user started to allow them to
stop it again by just grabbing at the slide. If you don't take care about this then when
the user tries to stop the animation, it will jump to the last frame (you can see this
with Apple scrolling when you drag a web-page beyond the end, let go and immediately try
to catch it, it's quite jarring).

Thankfully the browser implementors have our back with the [getComputedStyle](https://developer.mozilla.org/en-US/docs/DOM/window.getComputedStyle)
function. In order to allow the user to catch the slide as it animates, we check where the
slide actually is using `getComputedStyle`. Then we can stop the animation without it
jumping to the end.

## Apple scrolling?

This is not Apple scrolling, the physics model that [they
use](https://github.com/jimeh/PastryKit/blob/master/mobile/dist/PastryKit.js), is not very
amenable to Bezier-curving, and therefore very hard to emulate smoothly in a browser.
That said, I think the touchSlider preserves many of the important properties of
apple-scrolling: it's silky smooth, very responsive, and listens to what the user is
doing.

The main missing piece of the puzzle is bouncing. If the user flicks over the end of the
slides then the animation should continue moving in the direction of the flick for a short
time before decelerating and then reversing back into place; likewise if the user moves
towards the edge of a slide with high velocity (though not quite enough to jump them to
the next slide) the slide should appear to animate just beyond the end and back again.

The former should already work, but I haven't tested it on a WebKit with [negative control
point support](https://bugs.webkit.org/show_bug.cgi?id=45761); the latter will require
both a fixed WebKit and a new family of Bezier deceleration curves.

As always, bug reports and pull requests are welcome.

