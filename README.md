jQuery.touchSlider.js is yet-another touch-sensitive carousel jQuery plugin.
You can use it with Zepto.js too :).

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
of the slider width (e.g. 800px) a new slide appears, but feel free to have extra
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

### Graphics hardware pre-loading

When building websites with hardware accelerated graphics for the iPad, it's always a
necessity to push the elements you are going to animate onto the graphics hardware eagerly.
In this case, we actually need to do this both for the slides container and also for each
individual slide.

```css
.slides, .slides .slide {
    -webkit-transform: translate3D(0, 0, 0);
}
```

The slides container is what we're actually going to be animating, but
without encouragement the iPad will only pre-buffer the visible section of it. Setting a
null transform on each individual slide removes the tearing effect you otherwise get as a
slide becomes visible for the first time.

### CSS transitions

The most important part of implementing a slider like this is getting the behaviour right
when the user lifts their finger from the screen. Before that point, the position of the
slides can be set manually by javascript in response to `touchmove`; after that point, it's
necessary to guess at what the user expects.

The only performant way to do this is to use a CSS transition or animation. Trying to use
javascript is not nearly fast enough to maintain the illusion of smoothness. While
using CSS animation could give you precise pixel-by-pixel deceleration, it turns out that
using a carefully chosen transition leads to an effect that is just as nice and is
considerably less effort.

### Curve joining

There is one main issue with using CSS transitions after the user has let go of the
slide: unless you choose your transition carefully, there will be an unpleasant bump at
the point that the finger leaves the screen.

This is because the user is moving the slide at a particular velocity in order to drag it
out of the way, and the browser's CSS engine is also moving the slide at a
velocity defined by the choice of Bezier curve. Unless these two velocities match exactly
the user will experience a [C(1)
discontinuity](http://en.wikipedia.org/wiki/Smooth_function#Parametric_continuity), which
is subliminally distressing.

Luckily, the way Bezier curves are constructed makes it possible to avoid this case. In CSS
the velocity of a transition is proportional to the gradient of the Bezier curve, and the
gradient at the start of the curve `cubic-bezier(a, b, c, d)` is `a / b`. So all we have
to do is measure the velocity at which the user is moving the slide, and ensure that
`a / b` is equal to that.

![Bezier function comparison](http://code.rapportive.com/jquery-touchslider/img/continuity.svg)

To make the animation stop smoothly, we also set `d` equal to 1; this makes the final
velocity hit 0 at the same time as the animation stops. The other constraints on the
curve choice are a bit more nebulous: it should feel smooth at any speed, and different
curves at different speeds should feel similar. The current model we're using does a
reasonable job, but it was guessed more than calculated.

### Interruptible animations

When animating a user-initiated transition, it's vital to allow the user to
stop it again by just grabbing at the slide. If you don't take care about this, when
the user tries to stop the animation, it will jump to the last frame (you can see this
with Apple scrolling when you drag a web-page beyond the end, let go and immediately try
to catch it, it's quite jarring).

Thankfully, the browser implementors have thought of this and provided the
[getComputedStyle](https://developer.mozilla.org/en-US/docs/DOM/window.getComputedStyle)
function. In order to allow the user to grab the slide while it's animating, we check
where the slide actually is using `getComputedStyle` on the `touchstart` event.
Then we can stop the animation and set the current position explicitly so that there is no jump
moving back into manual mode.

## Apple scrolling?

This is not Apple scrolling. The physics model that [they
use](https://github.com/jimeh/PastryKit/blob/master/mobile/dist/PastryKit.js) is not very
amenable to Bezier-curving, and therefore very hard to emulate smoothly in a browser.
That said, I think the touchSlider preserves many of the important properties of
Apple scrolling: it's silky smooth and responsive to what the user is doing.

The main missing piece of the puzzle is bouncing. If the user flicks over the end of the
slides, the animation should continue moving in the direction of the flick for a short
time before decelerating and then reversing back into place. Likewise, if the user moves
towards the edge of a slide with high velocity (though not quite enough to jump them to
the next slide), the slide should appear to animate just beyond the end and back again.

The former should already work, but I haven't tested it on a WebKit with [negative control
point support](https://bugs.webkit.org/show_bug.cgi?id=45761); the latter will require
both a fixed WebKit and a new family of Bezier deceleration curves.

As always, bug reports and pull requests are welcome. jquery.touchSlider.js is released
under the MIT license.
