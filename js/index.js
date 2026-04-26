// Initialize Automated Image Slider (Carousel)
document.addEventListener('DOMContentLoaded', function() {
  const slidingContainer = document.querySelector('.sliding');
  const slidingPhotos = document.querySelector('.sliding-photos');
  
  if (slidingContainer && slidingPhotos) {
    const images = slidingPhotos.querySelectorAll('img');
    const totalImages = images.length;
    
    if (totalImages > 1) {
      let currentIndex = 0;
      
      // Override existing CSS animation for precise JS control
      slidingPhotos.style.animation = 'none';
      slidingPhotos.style.width = `${totalImages * 100}%`;
      slidingPhotos.style.transition = 'transform 2s cubic-bezier(0.25, 1, 0.5, 1)';
      slidingPhotos.style.willChange = 'transform';
      
      images.forEach(img => {
        img.style.flex = `0 0 ${100 / totalImages}%`;
        img.style.width = `${100 / totalImages}%`;
      });
      
      // Automate the swipe every 2 seconds
      setInterval(() => {
        currentIndex++;
        if (currentIndex >= totalImages) {
          currentIndex = 0; // Rewind smoothly back to the first image
        }
        slidingPhotos.style.transform = `translateX(-${currentIndex * (100 / totalImages)}%)`;
      }, 2000);
    }
  }
});

// Initialize Lenis for smooth scrolling
document.addEventListener('DOMContentLoaded', function() {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/lenis@1.1.20/dist/lenis.min.js';
  script.onload = () => {
        const lenis = new Lenis();
        
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        
        requestAnimationFrame(raf);
  };
  document.head.appendChild(script);
});

// Scroll-triggered animations for What We Do section
document.addEventListener('DOMContentLoaded', function() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    let staggerDelay = 0; // Track delay for batch intersections

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);

        // Delegate staggering to CSS using inline transition delay (GPU handled)
        entry.target.style.transitionDelay = `${staggerDelay}ms`;

        // Sync DOM class changes with the browser's render cycle
        requestAnimationFrame(() => {
          entry.target.classList.add('animate');
        });

        // Clean up the delay so hover effects aren't delayed afterward
        setTimeout(() => {
          entry.target.style.transitionDelay = '';
        }, staggerDelay + 600); // 600ms is the CSS transition duration

        staggerDelay += 100;
      }
    });
  }, observerOptions);

  // Observe all feature cards
  const features = document.querySelectorAll('.what-we-do .feature');
  features.forEach((feature) => {
    // Inform browser GPU to pre-allocate layers for smooth animations
    feature.style.willChange = 'opacity, transform';
    observer.observe(feature);
  });
});

// Handle testimonial form submission
const testimonialForm = document.getElementById('testimonialForm');
if (testimonialForm) {
  testimonialForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const testimony = document.getElementById('testimony').value.trim();

    // Validate inputs
    if (!fullName || !email || !testimony) {
      alert('Please fill in all fields.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Show success message
    const submitBtn = testimonialForm.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '✓ Testimony Sent!';
    submitBtn.style.background = '#4CAF50';

    // Reset form
    setTimeout(() => {
      testimonialForm.reset();
      submitBtn.textContent = originalText;
      submitBtn.style.background = '#000';
    }, 2000);
  });
}
