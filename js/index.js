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

// Handle referral tracking from URL
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  
  if (ref) {
    localStorage.setItem('referralUser', ref);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

// ==================================================
// REAL-TIME DEPOSIT/WITHDRAWAL ACTIVITY SIMULATION
// ==================================================
document.addEventListener('DOMContentLoaded', function() {
  const feedContainer = document.getElementById('activity-feed');
  if (!feedContainer) return;

  const namesPool = [
    // Realistic English/Western Names (Full)
    "John Smith", "David Wilson", "Michael Carter", "Sarah Brown", "Emma Thompson", "Daniel Scott", "Olivia Brown", "James Harris", "William Davis", "Emily Johnson", "Christopher White", "Megan Taylor", "Matthew Anderson", "Amanda Martinez", "Joshua Thomas", "Ashley Jackson", "Andrew White", "Brian Harris", "Kevin Martin", "Steven Thompson", "Timothy Garcia", "Jason Martinez", "Ryan Robinson", "Jacob Clark", "Gary Rodriguez", "Nicholas Lewis", "Eric Lee", "Stephen Walker", "Jonathan Hall", "Larry Allen", "Justin Young", "Scott Hernandez", "Brandon King", "Benjamin Wright", "Samuel Lopez", "Gregory Hill", "Frank Scott", "Alexander Green", "Patrick Adams", "Raymond Baker", "Jack Gonzalez", "Dennis Nelson", "Jerry Carter", "Tyler Mitchell", "Aaron Perez",
    
    // Realistic English/Western Names (Initials)
    "John D.", "Michael C.", "Sarah M.", "David W.", "Emma T.", "James R.", "Daniel S.", "Sophia L.", "William H.", "Olivia B.", "Chris W.", "Megan T.", "Matt A.", "Amanda M.", "Josh T.", "Ashley J.", "Andrew W.", "Brian H.", "Kevin M.", "Steve T.", "Tim G.", "Jason M.", "Ryan R.", "Jacob C.", "Gary R.", "Nick L.", "Eric L.", "Stephen W.", "Jon H.", "Larry A.", "Justin Y.", "Scott H.", "Brandon K.", "Ben W.", "Sam L.", "Greg H.", "Frank S.", "Alex G.", "Pat A.", "Ray B.", "Jack G.", "Dennis N.", "Jerry C.", "Tyler M.", "Aaron P.",

    // Realistic English/Western Names (Short)
    "Dave W.", "Mike C.", "Sarah B.", "Em T.", "Dan S.", "Liv B.", "Jim H.", "Will D.", "Emily J.", "Chris W.", "Meg T.", "Matt A.", "Amy M.", "Josh T.", "Ash J.", "Andy W.", "Bri H.", "Kev M.", "Steve T.", "Tim G.", "Jay M.", "Ry R.", "Jake C.", "Gary R.", "Nick L.", "Ric L.", "Steph W.", "Jon H.", "Lar A.", "Just Y.", "Scot H.", "Bran K.", "Ben W.", "Sam L.", "Greg H.", "Frank S.", "Alex G.", "Pat A.", "Ray B.", "Jack G.", "Den N.",

    // International Names (Full)
    "Chen Wei", "Hiro Tanaka", "Fatima Noor", "Carlos Mendes", "Luka Petrovic", "Ahmed Khalid", "Priya Sharma", "Ibrahim Musa", "Elena Petrova", "Kwame Mensah", "Sofia Alvarez", "Adeyemi Adeleke", "Yuki Sato", "Muhammad Ali", "Wei Chen", "Aisha Rahman", "Diego Rossi", "Katarina Novak", "Lars Müller", "Jin Soo", "Mei Ling", "Omar Farooq", "Anastasia Ivanova", "Giovanni Bianchi", "Nia Okafor", "Tariq Al-Fayed", "Min-Ji Kim", "Javier Morales", "Svetlana Popova", "Kofi Annan",
    
    // International Names (Initials)
    "Adeyemi A.", "Chen W.", "Hiro T.", "Fatima N.", "Carlos M.", "Luka P.", "Ahmed K.", "Priya S.", "Ibrahim M.", "Elena P.", "Kwame M.", "Sofia A.", "Yuki S.", "Muhammad A.", "Wei C.", "Aisha R.", "Diego R.", "Katarina N.", "Lars M.", "Jin S.", "Mei L.", "Omar F.", "Anastasia I.", "Giovanni B.", "Nia O.", "Tariq A.", "Min-Ji K.", "Javier M.", "Svetlana P.", "Kofi A.",

    // Limited Usernames/Aliases
    "CryptoAce", "PrimeVest", "AlphaTrade", "WealthPoint", "NexusCapital", "ApexInvest", "GlobalTrade", "SecureFund", "TitanWealth", "ZenithAssets", "YieldMaster", "CapGrow", "EquiPro", "VisionTrade", "VertexCapital"
  ];
  let nameIndex = 0;
  const MAX_ITEMS = 160;

  // Shuffle names randomly on load to ensure organic global diversity
  for (let i = namesPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [namesPool[i], namesPool[j]] = [namesPool[j], namesPool[i]];
  }

  function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateName() {
    const name = namesPool[nameIndex];
    nameIndex = (nameIndex + 1) % namesPool.length;
    return name;
  }

  function generateRandomActivity() {
    const type = Math.random() > 0.4 ? 'Deposit' : 'Withdrawal'; // 60% chance of deposit
    const name = generateName();
    let amount;
    if (type === 'Deposit') {
      const rand = Math.random();
      if (rand < 0.3) {
        // Low: $100 - $4,999
        amount = Math.floor(Math.random() * (4999 - 100 + 1)) + 100;
      } else if (rand < 0.8) {
        // Mid: $5,000 - $30,000
        amount = Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000;
      } else {
        // High: $40,000 - $100,000
        amount = Math.floor(Math.random() * (100000 - 40000 + 1)) + 40000;
      }
    } else {
      const rand = Math.random();
      if (rand < 0.4) {
        // Low: $10 - $4,999
        amount = Math.floor(Math.random() * (4999 - 10 + 1)) + 10;
      } else {
        // High: $5,000 - $20,000
        amount = Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
      }
    }

    return { type, name, amount };
  }

  function createActivityElement(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';

    const typeClass = activity.type.toLowerCase();
    const icon = typeClass === 'deposit' ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
    const amountSign = typeClass === 'deposit' ? '+' : '-';

    item.innerHTML = `
      <div class="activity-info">
        <div class="activity-icon ${typeClass}"><i class="${icon}"></i></div>
        <p class="activity-name">${activity.name}</p>
      </div>
      <div class="activity-amount ${typeClass}">
        ${amountSign}$${activity.amount.toLocaleString()}
      </div>
    `;
    return item;
  }

  function addActivity() {
    const activityData = generateRandomActivity();
    const newElement = createActivityElement(activityData);

    feedContainer.prepend(newElement);

    if (feedContainer.children.length > MAX_ITEMS) {
      feedContainer.lastElementChild.remove();
    }

    const randomInterval = Math.random() * (4500 - 2500) + 2500; // 2.5 to 4.5 seconds
    setTimeout(addActivity, randomInterval);
  }

  // Pre-fill function to instantly establish the massive multi-column architecture
  function initFeed() {
    const INITIAL_COUNT = 32; // Fills approximately 7-8 rows of grid space
    for (let i = 0; i < INITIAL_COUNT; i++) {
      const activityData = generateRandomActivity();
      const newElement = createActivityElement(activityData);
      
      // Bypass entrance animations for initial structural load
      newElement.style.animation = 'none';
      newElement.style.opacity = '1';
      newElement.style.transform = 'translateX(0)';
      
      feedContainer.appendChild(newElement);
    }
    setTimeout(addActivity, 2500); // Resume top-update animation loop
  }

  // Kick off the simulation immediately
  setTimeout(initFeed, 200);
});
