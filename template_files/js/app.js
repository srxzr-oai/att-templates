// Privacy.com Client-Side Application

// Additional functionality for dashboard and forms
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// Logout function
async function logout() {
    try {
        const response = await fetch('/logout');
        if (response.ok) {
            appState.session = {};
            window.history.pushState({}, '', '/');
            appState.currentPage = 'index';
            await loadTemplate('index');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Dashboard specific functions
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
            const data = await response.json();
            displayTransactions(data.transactions);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function displayTransactions(transactions) {
    const tbody = document.querySelector('#transactions-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = transactions.map(txn => `
        <tr>
            <td>${txn.merchant}</td>
            <td>****${txn.card_id.slice(-4)}</td>
            <td>$${txn.amount.toFixed(2)}</td>
            <td><span class="badge bg-${txn.status === 'approved' ? 'success' : 'warning'}">${txn.status}</span></td>
            <td>${new Date(txn.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Create card functionality
function initializeCreateCardForm() {
    const form = document.getElementById('createCardForm');
    if (form) {
        form.addEventListener('submit', handleCreateCard);
    }
}

async function handleCreateCard(event) {
    event.preventDefault();
    
    const form = event.target;
    const name = form.name.value;
    const limit = parseFloat(form.limit.value);
    const submitButton = document.getElementById('createCardButton');
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
    
    try {
        const response = await fetch('/api/create_card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                limit: limit
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCardModal'));
            if (modal) {
                modal.hide();
            }
            
            // Refresh cards
            await loadUserData();
            
            // Reset form
            form.reset();
            
            // Show success message
            showSuccessAlert('Virtual card created successfully!');
            
        } else {
            const errorData = await response.json();
            showError(errorData.detail || 'Failed to create card');
        }
    } catch (error) {
        console.error('Create card error:', error);
        showError('Network error. Please try again.');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-plus me-2"></i>Create Card';
    }
}

// Utility functions
function showSuccessAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of main container
    const mainContainer = document.querySelector('main .container');
    if (mainContainer) {
        mainContainer.insertBefore(alertDiv, mainContainer.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update dashboard stats
function updateDashboardStats(cards) {
    const totalCards = cards.length;
    const activeCards = cards.filter(card => card.status === 'active').length;
    const totalSpent = cards.reduce((sum, card) => sum + card.spent, 0);
    
    // Update DOM elements
    const totalCardsEl = document.getElementById('total-cards');
    const activeCardsEl = document.getElementById('active-cards');
    const totalSpentEl = document.getElementById('total-spent');
    const monthSpentEl = document.getElementById('month-spent');
    
    if (totalCardsEl) totalCardsEl.textContent = totalCards;
    if (activeCardsEl) activeCardsEl.textContent = activeCards;
    if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);
    if (monthSpentEl) monthSpentEl.textContent = formatCurrency(totalSpent * 0.3); // Mock monthly data
}

// Enhanced displayCards function with stats update
function displayCards(cards) {
    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;
    
    // Update stats
    updateDashboardStats(cards);
    
    cardsContainer.innerHTML = cards.map(card => `
        <div class="col-md-6 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title mb-0">${card.name}</h5>
                        <span class="badge bg-${card.status === 'active' ? 'success' : 'secondary'}">${card.status}</span>
                    </div>
                    <div class="virtual-card mb-3">
                        <div class="card-number">${card.last_four ? '•••• •••• •••• ' + card.last_four : '•••• •••• •••• ••••'}</div>
                        <div class="mt-2">
                            <small>Valid Thru 12/25</small>
                        </div>
                    </div>
                    <div class="row text-center">
                        <div class="col-6">
                            <strong>Limit</strong><br>
                            <span class="text-muted">${formatCurrency(card.limit)}</span>
                        </div>
                        <div class="col-6">
                            <strong>Spent</strong><br>
                            <span class="text-muted">${formatCurrency(card.spent)}</span>
                        </div>
                    </div>
                    <div class="mt-3">
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar" role="progressbar" 
                                 style="width: ${(card.spent / card.limit * 100)}%"></div>
                        </div>
                        <small class="text-muted">
                            ${formatCurrency(card.limit - card.spent)} remaining
                        </small>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="btn-group w-100" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="pauseCard('${card.id}')">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button type="button" class="btn btn-outline-info btn-sm" onclick="viewCardDetails('${card.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteCard('${card.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Card management functions
async function pauseCard(cardId) {
    // Implementation for pausing a card
    console.log('Pausing card:', cardId);
    // Add API call here
}

async function viewCardDetails(cardId) {
    // Implementation for viewing card details
    console.log('Viewing card details:', cardId);
    // Add modal or navigation here
}

async function deleteCard(cardId) {
    if (confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
        // Implementation for deleting a card
        console.log('Deleting card:', cardId);
        // Add API call here
    }
}

// Auto-refresh dashboard data
function startDashboardAutoRefresh() {
    // Refresh every 30 seconds
    setInterval(async () => {
        if (appState.currentPage === 'dashboard' && appState.session.user_email) {
            await loadUserData();
            await loadTransactions();
        }
    }, 30000);
}

// Initialize auto-refresh when dashboard loads
function initializeDashboard() {
    initializeDashboardPage();
    initializeCreateCardForm();
    startDashboardAutoRefresh();
    
    // Load initial data
    loadUserData();
    loadTransactions();
} 