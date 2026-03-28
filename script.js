const organizationsData = {
    professionalAffiliates: [
        {
            name: "National Academies Central Information Service",
            type: "Academic Organization",
            logo: "NA",
            members: 125,
            events: 15,
            description: "Dedicated to promoting academic excellence and providing information services to students and faculty."
        },
        {
            name: "National Student Clearinghouse",
            type: "Professional Organization", 
            logo: "NS",
            members: 89,
            events: 22,
            description: "Supporting students with career development and professional networking opportunities."
        },
        {
            name: "National Archives Student Association",
            type: "Academic Society",
            logo: "NA",
            members: 67,
            events: 18,
            description: "Connecting students interested in history, archives, and information management."
        },
        {
            name: "National University Student Government",
            type: "Student Government",
            logo: "NU",
            members: 45,
            events: 30,
            description: "Representing student interests and fostering leadership development across campus."
        }
    ],
    professional: [
        {
            name: "Political Science Society",
            type: "Academic Society",
            logo: "PS",
            members: 156,
            events: 25,
            description: "Engaging students in political discourse and public policy analysis."
        },
        {
            name: "Society of Student Leaders",
            type: "Leadership Society",
            logo: "SS",
            members: 78,
            events: 20,
            description: "Developing leadership skills and promoting community service initiatives."
        },
        {
            name: "Nu Neighborhood Association",
            type: "Community Organization",
            logo: "NH",
            members: 92,
            events: 12,
            description: "Building stronger connections between the university and local community."
        },
        {
            name: "Marketing Excellence Club",
            type: "Professional Society",
            logo: "ME",
            members: 134,
            events: 28,
            description: "Providing marketing students with real-world experience and industry connections."
        }
    ],
    officeAligned: [
        {
            name: "Black Studies - Nu Initiative",
            type: "Cultural Organization",
            logo: "BS",
            members: 87,
            events: 16,
            description: "Promoting awareness and understanding of Black history, culture, and contributions."
        },
        {
            name: "Graduate Sports Society",
            type: "Sports Organization",
            logo: "GS",
            members: 112,
            events: 35,
            description: "Bringing together graduate students through sports activities and competitions."
        },
        {
            name: "Transportation Studies Club",
            type: "Academic Organization",
            logo: "TS",
            members: 65,
            events: 14,
            description: "Exploring innovative solutions in transportation and urban planning."
        },
        {
            name: "NU LIBCU - Actual Sports Student Organization",
            type: "Sports Organization",
            logo: "AS",
            members: 98,
            events: 42,
            description: "Organizing competitive sports events and promoting athletic excellence among students."
        }
    ]
};

function createOrgCard(org) {
    return `
        <div class="org-card-wrapper animate-fade-in">
            <div class="org-card">
                <div class="org-card-body">
                    <div class="org-card-header">
                        <div class="org-logo">${org.logo}</div>
                        <div>
                            <h6 class="org-card-title">${org.name}</h6>
                            <small class="org-card-type">${org.type}</small>
                        </div>
                    </div>
                    
                    <div class="org-stats">
                        <div class="stat-item">
                            <div class="stat-number">${org.members}</div>
                            <div class="stat-label">Members</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${org.events}</div>
                            <div class="stat-label">Events</div>
                        </div>
                    </div>
                    
                    <p class="org-card-text">${org.description}</p>
                    
                    <button class="btn btn-primary view-details-btn" data-org-name="${org.name}">
                        <i class="bi bi-eye"></i>View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderOrganizations() {
    const professionalAffiliatesContainer = document.getElementById('professionalAffiliates');
    professionalAffiliatesContainer.innerHTML = organizationsData.professionalAffiliates
        .map(org => createOrgCard(org))
        .join('');

    const professionalContainer = document.getElementById('professional');
    professionalContainer.innerHTML = organizationsData.professional
        .map(org => createOrgCard(org))
        .join('');

    const officeAlignedContainer = document.getElementById('officeAligned');
    officeAlignedContainer.innerHTML = organizationsData.officeAligned
        .map(org => createOrgCard(org))
        .join('');
}

function performSearch(query) {
    const allCards = document.querySelectorAll('.org-card');
    const searchTerm = query.toLowerCase();

    allCards.forEach(card => {
        const cardWrapper = card.closest('.org-card-wrapper');
        const title = card.querySelector('.org-card-title').textContent.toLowerCase();
        const description = card.querySelector('.org-card-text').textContent.toLowerCase();
        const type = card.querySelector('.org-card-type').textContent.toLowerCase();
        
        const isVisible = title.includes(searchTerm) || 
                         description.includes(searchTerm) || 
                         type.includes(searchTerm);
        
        if (cardWrapper) {
            cardWrapper.style.display = isVisible || !query ? 'block' : 'none';
        }
    });
    
    updateCategorySections();
}

function updateCategorySections() {
    const categories = ['professionalAffiliates', 'professional', 'officeAligned'];
    
    categories.forEach(categoryId => {
        const categoryContainer = document.getElementById(categoryId);
        const categorySection = categoryContainer.closest('.category-section');
        const visibleCards = categoryContainer.querySelectorAll('.org-card-wrapper[style="display: block"], .org-card-wrapper:not([style])');
        
        if (categorySection) {
            categorySection.style.display = visibleCards.length > 0 ? 'block' : 'none';
        }
    });
}

function showOrganizationDetails(orgName) {
    let orgData = null;
    const allOrgs = [
        ...organizationsData.professionalAffiliates,
        ...organizationsData.professional,
        ...organizationsData.officeAligned
    ];
    
    orgData = allOrgs.find(org => org.name === orgName);
    
    if (orgData) {
        const modalHTML = `
            <div class="custom-modal-backdrop" id="orgModalBackdrop">
                <div class="custom-modal-content">
                    <div class="modal-header">
                        <div class="org-card-header">
                            <div class="org-logo">${orgData.logo}</div>
                            <div>
                                <h5 class="org-card-title">${orgData.name}</h5>
                                <small class="org-card-type">${orgData.type}</small>
                            </div>
                        </div>
                        <button type="button" class="modal-close-btn" data-dismiss-modal>
                            &times;
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-stats-row">
                            <div class="modal-stat">
                                <h4>${orgData.members}</h4>
                                <small>MEMBERS</small>
                            </div>
                            <div class="modal-stat">
                                <h4>${orgData.events}</h4>
                                <small>EVENTS</small>
                            </div>
                        </div>
                        <p class="modal-description">${orgData.description}</p>
                        <div class="modal-details-row">
                            <div class="modal-detail">
                                <h6>Meeting Schedule:</h6>
                                <p>Weekly meetings every Tuesday at 7:00 PM</p>
                            </div>
                            <div class="modal-detail">
                                <h6>Contact Information:</h6>
                                <p>Email: ${orgData.name.toLowerCase().replace(/\s+/g, '')}@nu.edu</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close-btn" data-dismiss-modal>Close</button>
                        <button type="button" class="btn btn-primary">
                            <i class="bi bi-person-plus"></i>Join Organization
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('orgModalBackdrop');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden'; 
        
        document.querySelectorAll('.modal-close-btn').forEach(button => {
            button.addEventListener('click', () => {
                const backdrop = document.getElementById('orgModalBackdrop');
                if (backdrop) {
                    backdrop.remove();
                    document.body.style.overflow = ''; 
                }
            });
        });
    }
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    setTimeout(() => {
        document.querySelectorAll('.org-card-wrapper').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }, 100);
}

function initNavbarScroll() {
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.custom-navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(26, 35, 126, 0.98)';
            navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.3)';
            navbar.style.backdropFilter = 'blur(20px)';
        } else {
            navbar.style.background = 'rgba(26, 35, 126, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.2)';
            navbar.style.backdropFilter = 'blur(15px)';
        }
    });
}

function showLoadingState() {
    const containers = ['professionalAffiliates', 'professional', 'officeAligned'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p class="loading-text">Loading organizations...</p>
            </div>
        `;
    });
}

function updateAuthStatus(isLoggedIn, userName = '') {
    const signInBtn = document.getElementById('sign-in-btn');
    const userSignOut = document.getElementById('user-sign-out');
    const userNameDisplay = document.getElementById('user-name-display');

    if (isLoggedIn) {
        signInBtn.style.display = 'none';
        userSignOut.style.display = 'block';
        userNameDisplay.textContent = `Hello, ${userName}!`;
    } else {
        signInBtn.style.display = 'block';
        userSignOut.style.display = 'none';
        userNameDisplay.textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    showLoadingState();
    
    setTimeout(() => {
        renderOrganizations();
        initScrollAnimations();
        initSmoothScrolling();
        initNavbarScroll();

        const loggedInUser = "John Doe"; 

        updateAuthStatus(true, loggedInUser);
        
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');

        searchButton.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
        
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
        
        document.getElementById('user-sign-out').addEventListener('click', function(e) {
            e.preventDefault();

            alert("You have been signed out.");
            updateAuthStatus(false);
        });
        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('view-details-btn') || e.target.closest('.view-details-btn')) {
                const button = e.target.classList.contains('view-details-btn') ? e.target : e.target.closest('.view-details-btn');
                const orgName = button.getAttribute('data-org-name');
                showOrganizationDetails(orgName);
            }
        });
        
        addInteractiveFeatures();
        
    }, 1000); 
});

function addInteractiveFeatures() {
    document.querySelectorAll('.org-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    document.querySelectorAll('.btn, .search-button').forEach(btn => {
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

const rippleCSS = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }

    /* Modal styles */
    .custom-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1050;
    }

    .custom-modal-content {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        width: 90%;
        max-width: 800px;
        padding: 2rem;
        position: relative;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .modal-close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
    }

    .modal-body h4 {
        color: #1a237e;
    }

    .modal-stats-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .modal-stat {
        background-color: #f8f9fa;
        padding: 1.5rem;
        text-align: center;
        border-radius: 8px;
    }

    .modal-description {
        line-height: 1.6;
        color: #495057;
        margin-bottom: 1.5rem;
    }

    .modal-details-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }

    .modal-detail h6 {
        color: #1a237e;
        font-size: 1rem;
        margin-bottom: 0.5rem;
    }

    .modal-detail p {
        color: #6c757d;
        font-size: 0.9rem;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding-top: 1.5rem;
        border-top: 1px solid #eee;
        margin-top: 1.5rem;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 5rem 0;
    }

    .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border-left-color: #1a237e;
        animation: spin 1s ease infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);