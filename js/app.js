
console.log("app.js script loaded and running!");

import { db, collection, addDoc, getDocs, doc, updateDoc, increment, setDoc, getDoc } from './firebase-config.js';
// Helper to get the current Shop ID from browser memory
const getShopId = () => localStorage.getItem("shopId");

// Helper to ensure a shop is actually logged in before showing data
const isShopValid = () => {
    const id = getShopId();
    if (!id) {
        console.warn("No Shop ID found! Redirecting to login.");
        window.location.href = "index.html";
        return false;
    }
    return id;
};

const loadGlobalData = async () => {
    const shopId = getShopId(); //
    if (!shopId) return; 

    // Point to the PRIVATE settings folder for THIS shop
    const settingsDocRef = doc(db, "shops", shopId, "settings", "shopDetails");
    
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            const shopkeeperNameHeaders = document.querySelectorAll('.user-profile span');
            shopkeeperNameHeaders.forEach(header => {
                header.textContent = settings.shopkeeperName || 'Shopkeeper';
            });
        }
    } catch (error) {
        console.error("Error loading global settings:", error);
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    console.log("Page ID detected:", pageId);
    if (pageId === "page-login") {
        // FORCE DELETE everything to stop the "ghost login" and auto-fill loops
        localStorage.clear(); 
        console.log("LOGIN PAGE: Browser memory purged to prevent old session interference.");
        initLoginPage();
        return; 
    }

    const loggedIn = localStorage.getItem("loggedIn");
    if (!loggedIn || loggedIn !== "true") {
        window.location.href = "index.html";
        return; 
    }

    // FORCE-ATTACH PDF BUTTONS FOR ALL REPORT PAGES
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.onclick = (e) => {
            e.preventDefault();
            // This detects which page you are on and sets the PDF title
            const reportTitle = pageId.replace('page-', '').replace('-', ' ').toUpperCase();
            exportTableToPDF('.data-table', reportTitle);
        };
    }

    loadGlobalData();
    // Your existing switch statement continues here...
    switch (pageId) {
        case 'page-dashboard':
            initDashboardPage();
            break;
        case 'page-inventory':
            initInventoryPage();
            break;
        case 'page-billing':
            initBillingPage();
            break;
        case 'page-customers':
            initCustomerPage();
            break;
        case 'page-reports':
            console.log("On Reports Hub page.");
            break;
        case 'page-sales-report':
            initSalesReportPage();
            break;
        case 'page-product-report':
            initProductReportPage();
            break;
        case 'page-inventory-report':
            initInventoryReportPage();
            break;
        case 'page-profit-loss-report':
            initProfitLossReportPage();
            break;
        case 'page-settings':
            initSettingsPage();
            break;
        case 'page-genie':
            initAIAssistantPage();
            break;
    }
});



const initLoginPage = () => {
    const loginForm = document.getElementById('login-form');
    const signupBtn = document.getElementById("signup-btn");
    const signupBox = document.getElementById("signup-box");
    const cancelSignupBtn = document.getElementById("cancel-signup-btn");
    const createAccountBtn = document.getElementById("create-account-btn");

    signupBtn?.addEventListener("click", () => signupBox.classList.remove("hidden"));
    cancelSignupBtn?.addEventListener("click", () => signupBox.classList.add("hidden"));

    createAccountBtn?.addEventListener("click", async () => {
        const phone = String(document.getElementById("signup-phone").value).trim();
        const pin = String(document.getElementById("signup-pin").value).trim();

        if(phone.length !== 10 || pin.length !== 4){
            alert("Enter a valid 10-digit phone & 4-digit PIN.");
            return;
        }

        try {
            const shopsRef = collection(db, "shops");
            const querySnapshot = await getDocs(shopsRef);
        
            for (const shopDoc of querySnapshot.docs) {
                const settingsRef = doc(db, "shops", shopDoc.id, "settings", "shopDetails");
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists() && String(settingsSnap.data().loginPhone).trim() === phone) {
                    alert("An account with this phone number already exists!");
                    return;
                }
            }

            const newShopId = "shop_" + Date.now();

            // 1. Create the ACTUAL parent shop document first so it exists for getDocs()
            const mainShopDocRef = doc(db, "shops", newShopId);
            await setDoc(mainShopDocRef, { 
                created: new Date(),
                shopId: newShopId 
            });

            // 2. Now create the nested settings document as you did before
            const settingsDocRef = doc(db, "shops", newShopId, "settings", "shopDetails");
            await setDoc(settingsDocRef, { 
                loginPhone: phone, 
                loginPin: pin,     
                shopId: newShopId
            });

            alert("Account created! You can now login.");
            signupBox.classList.add("hidden");
        } catch (error) {
            console.error("Signup error:", error);
            alert("Could not create account.");
        }
    });
    loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const phoneInput = String(document.getElementById('phone').value).trim();
    const pinInput = String(document.getElementById('pin').value).trim();

    console.log("LOGIN START: Searching for", phoneInput);

    try {
        const shopsRef = collection(db, "shops");
        const querySnapshot = await getDocs(shopsRef);
        
        if (querySnapshot.empty) {
            console.error("DATABASE ERROR: No shops found at all.");
            alert("No accounts found in system.");
            return;
        }

        let foundShopId = null;

        // Iterate through every shop to find the one with matching credentials
        for (const shopDoc of querySnapshot.docs) {
            const shopId = shopDoc.id;
            console.log("Checking Shop ID:", shopId);

            // Path must match your Screenshot 2.47.47 PM exactly
            const settingsRef = doc(db, "shops", shopId, "settings", "shopDetails");
            const settingsSnap = await getDoc(settingsRef);

            if (settingsSnap.exists()) {
                const data = settingsSnap.data();
                const dbPhone = String(data.loginPhone || "").trim();
                const dbPin = String(data.loginPin || "").trim();

                console.log(`Comparing: Input(${phoneInput}) vs DB(${dbPhone})`);

                if (dbPhone === phoneInput && dbPin === pinInput) {
                    foundShopId = shopId;
                    console.log("MATCH FOUND!");
                    break; 
                }
            } else {
                console.warn(`No shopDetails found for ${shopId}`);
            }
        }

        if (foundShopId) {
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("shopId", foundShopId);
            window.location.href = 'dashboard.html';
        } else {
            console.error("LOGIN FAILED: No match found after checking all shops.");
            alert("Incorrect phone or PIN!");
        }

    } catch (error) {
        console.error("SYSTEM ERROR:", error);
        alert("Database connection error. Check console.");
    }
});
};
const initDashboardPage = () => {
    const salesChartCanvas = document.getElementById('salesChart');
    const topProductsChartCanvas = document.getElementById('topProductsChart');
    const profitChartCanvas = document.getElementById('profitChart');
    const inventoryValueChartCanvas = document.getElementById('inventoryValueChart');
    
    const billingStatEl = document.getElementById('billing-stat');
    const inventoryStatEl = document.getElementById('inventory-stat');
    const customersStatEl = document.getElementById('customers-stat');
    
    const todaySalesEl = document.getElementById('today-sales-metric');
    const lowStockEl = document.getElementById('low-stock-metric');
    const totalProductsEl = document.getElementById('total-products-metric');
    const totalCustomersEl = document.getElementById('total-customers-metric');

    const renderSalesChart = (salesData) => {
        const today = new Date();
        const labels = [];
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dayLabel = i === 0 ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' });
            labels.push(dayLabel);
            
            const dateString = date.toISOString().split('T')[0];
            const dailyTotal = salesData
                .filter(sale => {
                    const saleDate = sale.createdAt.toDate().toISOString().split('T')[0];
                    return saleDate === dateString;
                })
                .reduce((sum, sale) => sum + sale.total, 0);
            
            data.push(dailyTotal);
        }

        new Chart(salesChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales (₹)',
                    data: data,
                    backgroundColor: 'rgba(26, 115, 232, 0.8)',
                    borderRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    };

    const renderTopProductsChart = (salesData) => {
        const productSales = new Map();
        salesData.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    const existing = productSales.get(item.name) || 0;
                    productSales.set(item.name, existing + item.quantity);
                });
            }
        });
        const sortedProducts = [...productSales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const labels = sortedProducts.map(p => p[0]);
        const data = sortedProducts.map(p => p[1]);

        new Chart(topProductsChartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity Sold',
                    data: data,
                    backgroundColor: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    const renderProfitChart = (salesData) => {
        const productProfit = new Map();
        salesData.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    const profit = (item.price - (item.purchasePrice || 0)) * item.quantity;
                    const existing = productProfit.get(item.name) || 0;
                    productProfit.set(item.name, existing + profit);
                });
            }
        });
        const sortedProfit = [...productProfit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const labels = sortedProfit.map(p => p[0]);
        const data = sortedProfit.map(p => p[1]);

        new Chart(profitChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gross Profit (₹)',
                    data: data,
                    backgroundColor: 'rgba(15, 157, 88, 0.8)',
                    borderRadius: 5
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    };

    const renderInventoryValueChart = (inventoryData) => {
        const categoryValue = new Map();
        inventoryData.forEach(item => {
            const value = (item.purchasePrice || 0) * item.stock;
            const category = item.category || 'Uncategorized';
            const existing = categoryValue.get(category) || 0;
            categoryValue.set(category, existing + value);
        });
        const labels = [...categoryValue.keys()];
        const data = [...categoryValue.values()];

        new Chart(inventoryValueChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Stock Value (₹)',
                    data: data,
                    backgroundColor: ['#F4B400', '#DB4437', '#4285F4', '#0F9D58', '#AB47BC']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    const fetchDashboardData = async () => {
        try {
            // 1. Get the current Shop ID from memory
            const shopId = getShopId(); 
            if (!shopId) return;

            // 2. Fetch data from the PRIVATE sub-collections for THIS shop only
            const [inventorySnapshot, customersSnapshot, salesSnapshot] = await Promise.all([
                getDocs(collection(db, "shops", shopId, "inventory")),
                getDocs(collection(db, "shops", shopId, "customers")),
                getDocs(collection(db, "shops", shopId, "sales"))
            ]);

            const salesData = [];
            salesSnapshot.forEach(doc => salesData.push(doc.data()));

            const todayString = new Date().toISOString().split('T')[0];
            let todayTotalSales = 0;
            salesData.forEach(sale => {
                const saleDateString = sale.createdAt.toDate().toISOString().split('T')[0];
                if (saleDateString === todayString) {
                    todayTotalSales += sale.total;
                }
            });

            let lowStockCount = 0;
            inventorySnapshot.forEach(doc => {
                if (doc.data().stock < 10) {
                    lowStockCount++;
                }
            });

            // Update UI elements
            inventoryStatEl.textContent = `${lowStockCount} Items Low`;
            customersStatEl.textContent = `${customersSnapshot.size} Total`;
            billingStatEl.textContent = `${salesSnapshot.size} Bills Today`;
            
            lowStockEl.textContent = lowStockCount;
            totalProductsEl.textContent = inventorySnapshot.size;
            totalCustomersEl.textContent = customersSnapshot.size;
            todaySalesEl.textContent = `₹ ${todayTotalSales.toFixed(2)}`;

            const inventoryData = [];
            inventorySnapshot.forEach(doc => inventoryData.push(doc.data()));
            
            // Render charts using the isolated data
            renderSalesChart(salesData);
            renderTopProductsChart(salesData);
            renderProfitChart(salesData);
            renderInventoryValueChart(inventoryData);

        } catch (error) {
            console.error("Error fetching dashboard data: ", error);
        }
    };
    fetchDashboardData();
};

const initInventoryPage = () => {
    const addItemModal = document.getElementById('add-item-modal');
    const addItemBtn = document.getElementById('add-item-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addItemForm = document.getElementById('add-item-form');
    const inventoryTableBody = document.querySelector('.data-table tbody');
    const searchInput = document.querySelector('#page-inventory .search-bar input');

    let allInventory = [];

    const renderInventoryTable = (itemsToRender) => {
        inventoryTableBody.innerHTML = '';
        itemsToRender.forEach((itemData, idx) => {
            const purchasePrice = itemData.purchasePrice ? itemData.purchasePrice.toFixed(2) : '0.00';
            const sellingPrice = itemData.price ? itemData.price.toFixed(2) : '0.00';
            const stockLevelClass = itemData.stock < 10 ? 'stock-level-low' : 'stock-level-ok';

            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${itemData.name}</td>
                <td>${itemData.category || 'N/A'}</td>
                <td><span class="${stockLevelClass}">${itemData.stock} Units</span></td>
                <td>₹ ${purchasePrice}</td>
                <td>₹ ${sellingPrice}</td>
                <td><button class="btn-sm btn-edit" data-index="${idx}">Edit</button></td>
            `;
            inventoryTableBody.appendChild(newRow);
        });
    };

    const fetchInventory = async () => {
        const shopId = getShopId(); //
        if (!shopId) return;

        // Only get items from THIS shop's sub-collection
        const querySnapshot = await getDocs(collection(db, "shops", shopId, "inventory")); 
        allInventory = [];
        querySnapshot.forEach((doc) => {
            allInventory.push({ id: doc.id, ...doc.data() });
        });
        renderInventoryTable(allInventory);
    };
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        if (!searchTerm) {
            renderInventoryTable(allInventory);
            return;
        }
        const filteredInventory = allInventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
        renderInventoryTable(filteredInventory);
    });

    const openModal = () => addItemModal.classList.remove('hidden');
    const closeModal = () => addItemModal.classList.add('hidden');

    addItemBtn.addEventListener('click', () => {
        addItemForm.reset();
        addItemForm.dataset.editingId = '';
        openModal();
    });
    closeModalBtn.addEventListener('click', closeModal);
    addItemModal.addEventListener('click', (event) => {
        if (event.target === addItemModal) closeModal();
    });

    // Edit button functionality
    inventoryTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-edit')) {
            const idx = event.target.dataset.index;
            const item = allInventory[idx];
            if (!item) return;
            // Fill form with item data
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-category').value = item.category || '';
            document.getElementById('stock-quantity').value = item.stock;
            document.getElementById('purchase-price').value = item.purchasePrice;
            document.getElementById('selling-price').value = item.price;
            document.getElementById('expiry-date').value = item.expiry || '';
            addItemForm.dataset.editingId = item.id;
            openModal();
        }
    });

    addItemForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const shopId = getShopId(); //
        
        const newItem = {
            name: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            stock: parseInt(document.getElementById('stock-quantity').value),
            purchasePrice: parseFloat(document.getElementById('purchase-price').value),
            price: parseFloat(document.getElementById('selling-price').value),
            expiry: document.getElementById('expiry-date').value || null
        };

        const editingId = addItemForm.dataset.editingId;
        try {
            if (editingId) {
                // Update existing item in the shop's private folder
                const itemRef = doc(db, "shops", shopId, "inventory", editingId); 
                await updateDoc(itemRef, newItem);
                const idx = allInventory.findIndex(i => i.id === editingId);
                if (idx > -1) allInventory[idx] = { id: editingId, ...newItem };
            } else {
                // Add new item to the shop's private collection
                const docRef = await addDoc(collection(db, "shops", shopId, "inventory"), newItem); 
                allInventory.push({ id: docRef.id, ...newItem });
            }
            renderInventoryTable(allInventory);
            closeModal();
            addItemForm.reset();
            addItemForm.dataset.editingId = '';
        } catch (e) {
            console.error("Error saving item: ", e);
            alert("Could not save item.");
        }
    });

    fetchInventory();
};


const initBillingPage = () => {
    let inventory = [];
    let customers = [];
    let currentBillItems = [];

    const productList = document.getElementById('product-list');
    const billItemsContainer = document.querySelector('.bill-items');
    const subtotalEl = document.querySelector('.bill-summary .summary-row:nth-child(1) span:nth-child(2)');
    const totalEl = document.querySelector('.bill-summary .summary-row.total span:nth-child(2)');
    const completePaymentBtn = document.getElementById('complete-payment-btn');
    const micBtn = document.getElementById('mic-btn');
    const voiceStatusEl = document.getElementById('voice-status');
    const customerSelectEl = document.getElementById('bill-customer');
    
    const addCustomerBtnBilling = document.getElementById('add-customer-btn-billing');
    const addCustomerModal = document.getElementById('add-customer-modal');
    const closeCustomerModalBtn = document.getElementById('close-customer-modal-btn');
    const addCustomerForm = document.getElementById('add-customer-form');
    
    const productSearchInput = document.getElementById('product-search-input');

    const displayProducts = (productsToDisplay) => {
        productList.innerHTML = '';
        productsToDisplay.forEach(product => {
            const listItem = document.createElement('div');
            listItem.className = 'product-list-item';
            listItem.dataset.productId = product.id;
            listItem.innerHTML = `
                <span>${product.name}</span>
                <span>₹ ${product.price.toFixed(2)}</span>
            `;
            productList.appendChild(listItem);
        });
    };
    
    productSearchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredProducts = inventory.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
        displayProducts(filteredProducts);
    });

    const fetchProductsForBilling = async () => {
        const shopId = getShopId(); // Get current shop ID
        const querySnapshot = await getDocs(collection(db, "shops", shopId, "inventory")); // Get private inventory
        inventory = [];
        querySnapshot.forEach((doc) => {
            inventory.push({ id: doc.id, ...doc.data() });
        });
        displayProducts(inventory);
    };

    const fetchCustomersForBilling = async () => {
        const shopId = getShopId(); // Get current shop ID
        const querySnapshot = await getDocs(collection(db, "shops", shopId, "customers")); // Get private customers
        customers = [];
        customerSelectEl.innerHTML = '<option value="">None</option>';
        querySnapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() };
            customers.push(customer);
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} - ${customer.phone}`;
            customerSelectEl.appendChild(option);
        });
    };

    const renderBill = () => {
        billItemsContainer.innerHTML = '';
        let subtotal = 0;
        currentBillItems.forEach(item => {
            const billItemEl = document.createElement('div');
            billItemEl.className = 'bill-item';
            billItemEl.innerHTML = `
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty">x ${item.quantity}</span>
                </div>
                <div class="item-actions">
                    <span class="item-price">₹ ${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="btn-remove-item" data-product-id="${item.id}">&times;</button>
                </div>
            `;
            billItemsContainer.appendChild(billItemEl);
            subtotal += item.price * item.quantity;
        });
        subtotalEl.textContent = `₹ ${subtotal.toFixed(2)}`;
        totalEl.textContent = `₹ ${subtotal.toFixed(2)}`;
    };

    const addItemToBill = (productId) => {
        const product = inventory.find(p => p.id === productId);
        if (!product) return false;
        const billItem = currentBillItems.find(item => item.id === productId);
        const quantityInBill = billItem ? billItem.quantity : 0;
        if (product.stock > quantityInBill) {
            if (billItem) {
                billItem.quantity++;
            } else {
                currentBillItems.push({ ...product, quantity: 1 });
            }
            renderBill();
            return true;
        } else {
            alert(`${product.name} is out of stock!`);
            return false;
        }
    };
    
    const removeItemFromBill = (productId) => {
        const itemIndex = currentBillItems.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            const item = currentBillItems[itemIndex];
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                currentBillItems.splice(itemIndex, 1);
            }
            renderBill();
        }
    };

    productList.addEventListener('click', (event) => {
        const listItem = event.target.closest('.product-list-item');
        if (listItem) {
            addItemToBill(listItem.dataset.productId);
        }
    });
    
    billItemsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-item')) {
            const productId = event.target.dataset.productId;
            removeItemFromBill(productId);
        }
    });

    completePaymentBtn.addEventListener('click', async () => {
        if (currentBillItems.length === 0) {
            alert('The bill is empty.');
            return;
        }
        try {
            const shopId = getShopId(); // Get current shop ID
            const totalAmount = parseFloat(totalEl.textContent.replace('₹ ', ''));
            const selectedCustomerId = customerSelectEl.value;
            
            // 1. Update stock in the PRIVATE inventory sub-collection
            const updatePromises = currentBillItems.map(item => {
                const productRef = doc(db, "shops", shopId, "inventory", item.id);
                return updateDoc(productRef, { stock: increment(-item.quantity) });
            });

            // 2. Add the sale record to the PRIVATE sales sub-collection
            updatePromises.push(
                addDoc(collection(db, "shops", shopId, "sales"), {
                    items: currentBillItems,
                    total: totalAmount,
                    createdAt: new Date(),
                    customerId: selectedCustomerId || null
                })
            );

            // 3. Update customer details in the PRIVATE customer sub-collection
            if (selectedCustomerId) {
                const customerRef = doc(db, "shops", shopId, "customers", selectedCustomerId);
                updatePromises.push(
                    updateDoc(customerRef, {
                        totalSpent: increment(totalAmount),
                        lastVisit: new Date()
                    })
                );
            }

            await Promise.all(updatePromises);
            currentBillItems = [];
            renderBill();
            await fetchProductsForBilling(); 
            alert('Sale completed and saved!');
        } catch (error) {
            console.error("Error processing sale: ", error);
            alert("Could not complete sale. Please try again.");
        }
    });

    const openCustomerModal = () => addCustomerModal.classList.remove('hidden');
    const closeCustomerModal = () => addCustomerModal.classList.add('hidden');

    addCustomerBtnBilling.addEventListener('click', openCustomerModal);
    closeCustomerModalBtn.addEventListener('click', closeCustomerModal);
    addCustomerModal.addEventListener('click', (event) => {
        if (event.target === addCustomerModal) closeCustomerModal();
    });

    // FIND THIS IN initBillingPage:
    addCustomerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const shopId = getShopId(); // Ensure we have the current shop ID
    
        const newCustomer = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            createdAt: new Date(),
            totalSpent: 0,
            lastVisit: null
        };
        try {
            // Correctly scoped to the private shop collection
            const docRef = await addDoc(collection(db, "shops", shopId, "customers"), newCustomer);
            console.log("New customer added to shop:", shopId);
            await fetchCustomersForBilling();
            customerSelectEl.value = docRef.id;
            closeCustomerModal();
            addCustomerForm.reset();
        } catch (e) {
            console.error("Error adding customer: ", e);
            alert("Could not save customer.");
        }
    });
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const numberWords = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        micBtn.addEventListener('click', () => recognition.start());
        recognition.onstart = () => {
            voiceStatusEl.textContent = "Listening...";
            micBtn.classList.add('is-listening');
        };
        recognition.onend = () => {
            voiceStatusEl.textContent = 'Click mic and say "add 2 potato"';
            micBtn.classList.remove('is-listening');
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceStatusEl.textContent = "Sorry, I didn't catch that.";
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            voiceStatusEl.textContent = `Heard: "${transcript}"`;
            if (transcript.startsWith('add ')) {
                const command = transcript.substring(4);
                const parts = command.split(' ');
                let quantity = parseInt(parts[0]);
                if (isNaN(quantity)) {
                    quantity = numberWords[parts[0]];
                }
                const productName = parts.slice(1).join(' ');
                if (quantity && productName) {
                    const product = inventory.find(p => {
                        const inventoryName = p.name.toLowerCase();
                        return inventoryName.includes(productName) || productName.includes(inventoryName);
                    });
                    if (product) {
                        for (let i = 0; i < quantity; i++) {
                            const wasAdded = addItemToBill(product.id);
                            if (!wasAdded) break;
                        }
                    } else {
                        voiceStatusEl.textContent = `Sorry, I couldn't find "${productName}".`;
                    }
                }
            }
        };
    } else {
        micBtn.style.display = 'none';
        voiceStatusEl.textContent = "Sorry, your browser doesn't support voice commands.";
    }

    fetchProductsForBilling();
    fetchCustomersForBilling();
    renderBill();
};

const initCustomerPage = () => {
    let allCustomers = [];
    const addCustomerModal = document.getElementById('add-customer-modal');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const closeCustomerModalBtn = document.getElementById('close-customer-modal-btn');
    const addCustomerForm = document.getElementById('add-customer-form');
    const customerTableBody = document.querySelector('.data-table tbody');
    const searchInput = document.getElementById('customer-search-input');

    const renderCustomerTable = (customersToRender) => {
        customerTableBody.innerHTML = '';
        customersToRender.forEach(customerData => {
            const newRow = document.createElement('tr');
            const lastVisitDate = customerData.lastVisit ? new Date(customerData.lastVisit.seconds * 1000).toLocaleDateString('en-IN') : 'N/A';
            const totalSpent = customerData.totalSpent ? customerData.totalSpent.toFixed(2) : '0.00';

            newRow.innerHTML = `
                <td>${customerData.name}</td>
                <td>${customerData.phone}</td>
                <td>${lastVisitDate}</td>
                <td>₹ ${totalSpent}</td>
                <td><button class="btn-sm btn-edit">View</button></td>
            `;
            customerTableBody.appendChild(newRow);
        });
    };

    const fetchCustomers = async () => {
        const shopId = getShopId(); //
        if (!shopId) return; //

        // Fetch only customers belonging to THIS shop
        const querySnapshot = await getDocs(collection(db, "shops", shopId, "customers")); 
        allCustomers = [];
        querySnapshot.forEach((doc) => {
            allCustomers.push({ id: doc.id, ...doc.data() }); //
        });
        renderCustomerTable(allCustomers); //
    };

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        if (!searchTerm) {
            renderCustomerTable(allCustomers);
            return;
        }
        const filteredCustomers = allCustomers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) || 
            customer.phone.includes(searchTerm)
        );
        renderCustomerTable(filteredCustomers);
    });

    const openCustomerModal = () => addCustomerModal.classList.remove('hidden');
    const closeCustomerModal = () => addCustomerModal.classList.add('hidden');

    addCustomerBtn.addEventListener('click', openCustomerModal);
    closeCustomerModalBtn.addEventListener('click', closeCustomerModal);
    addCustomerModal.addEventListener('click', (event) => {
        if (event.target === addCustomerModal) closeCustomerModal();
    });

    addCustomerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const shopId = getShopId(); //
        
        const newCustomer = {
            name: document.getElementById('customer-name').value, //
            phone: document.getElementById('customer-phone').value, //
            createdAt: new Date(), //
            totalSpent: 0, //
            lastVisit: null //
        };
        try {
            // Save to the PRIVATE customer collection for THIS shop
            const docRef = await addDoc(collection(db, "shops", shopId, "customers"), newCustomer); 
            allCustomers.push({ id: docRef.id, ...newCustomer }); //
            renderCustomerTable(allCustomers); //
            closeCustomerModal(); //
            addCustomerForm.reset(); //
        } catch (e) {
            console.error("Error adding customer: ", e); //
            alert("Could not save customer."); //
        }
    });
    fetchCustomers();
};

// Utility function to export a table to PDF using jsPDF and autoTable
const exportTableToPDF = (tableSelector, title = "Report") => {
    console.log("PDF function triggered for table:", tableSelector); // Check console for this!
    
    const { jsPDF } = window.jspdf || window;
    if (!jsPDF) {
        alert("ERROR: PDF libraries not found. Add the scripts to your HTML head.");
        return;
    }

    try {
        const doc = new jsPDF();
        const table = document.querySelector(tableSelector);

        if (!table || table.rows.length <= 1) {
            alert("No data found in table. Please wait for data to load.");
            return;
        }

        doc.text(title, 14, 20);
        doc.autoTable({
            html: table,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [26, 115, 232] }
        });

        doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
        console.log("PDF successful.");
    } catch (err) {
        console.error("Critical PDF Error:", err);
    }
};
const initSalesReportPage = async () => {
    const salesTableBody = document.querySelector('.data-table tbody');
    if (!salesTableBody) return;

    const shopId = getShopId(); // Get current shop ID
    if (!shopId) return;

    // PDF Export Button
    // PDF Export Button Fix
    // PDF Export Button
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.onclick = null; // Clear old listeners
        exportBtn.onclick = (e) => {
            e.preventDefault();
            exportTableToPDF('.data-table', 'Sales Report');
        };
    }

    // 1. Fetch only THIS shop's customers to map IDs to Names
    const customersSnapshot = await getDocs(collection(db, "shops", shopId, "customers"));
    const customersMap = new Map();
    customersSnapshot.forEach(doc => {
        customersMap.set(doc.id, doc.data().name);
    });

    const renderSaleRow = (saleData) => {
        const newRow = document.createElement('tr');
        // Handle Firestore timestamp correctly
        const dateObj = saleData.createdAt?.seconds ? new Date(saleData.createdAt.seconds * 1000) : new Date();
        const saleDate = dateObj.toLocaleDateString('en-IN');
        const customerName = saleData.customerId ? customersMap.get(saleData.customerId) : 'N/A';
        
        const itemsList = saleData.items.map(item => `${item.name} (x${item.quantity})`).join(', ');

        newRow.innerHTML = `
            <td>${saleDate}</td>
            <td>${customerName}</td>
            <td>${itemsList}</td>
            <td>₹ ${saleData.total.toFixed(2)}</td>
        `;
        salesTableBody.appendChild(newRow);
    };

    const fetchSales = async () => {
        salesTableBody.innerHTML = '';
        // 2. Fetch only THIS shop's sales
        const querySnapshot = await getDocs(collection(db, "shops", shopId, "sales"));
        querySnapshot.forEach((doc) => {
            renderSaleRow(doc.data());
        });
    };

    fetchSales();
};

const initProductReportPage = async () => {
    const productReportTableBody = document.querySelector('.data-table tbody');
    if (!productReportTableBody) return;

    // 1. Get the current Shop ID
    const shopId = getShopId();
    if (!shopId) return;

    // PDF Export Button
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.onclick = null; // Clear old listeners
        exportBtn.onclick = (e) => {
            e.preventDefault();
            exportTableToPDF('.data-table', 'Product Report');
        };
    }

    const renderProductReportRow = (productData) => {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${productData.name}</td>
            <td>${productData.totalQuantitySold} Units</td>
            <td>₹ ${productData.totalRevenue.toFixed(2)}</td>
        `;
        productReportTableBody.appendChild(newRow);
    };

    const generateProductReport = async () => {
        productReportTableBody.innerHTML = '';
        
        // 2. Fetch sales ONLY from this shop's private folder
        const salesSnapshot = await getDocs(collection(db, "shops", shopId, "sales"));
        const productData = new Map();

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    if (productData.has(item.name)) {
                        const existing = productData.get(item.name);
                        existing.totalQuantitySold += item.quantity;
                        existing.totalRevenue += item.price * item.quantity;
                    } else {
                        productData.set(item.name, {
                            name: item.name,
                            totalQuantitySold: item.quantity,
                            totalRevenue: item.price * item.quantity
                        });
                    }
                });
            }
        });

        const sortedProducts = Array.from(productData.values())
            .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

        sortedProducts.forEach(product => {
            renderProductReportRow(product);
        });
    };

    generateProductReport();
};

const initInventoryReportPage = async () => {
    const inventoryReportTableBody = document.querySelector('.data-table tbody');
    const grandTotalEl = document.getElementById('inventory-grand-total');
    if (!inventoryReportTableBody || !grandTotalEl) return;

    // 1. Get the current Shop ID
    const shopId = getShopId();
    if (!shopId) return;

    // PDF Export Button
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.onclick = null; // Clear old listeners
        exportBtn.onclick = (e) => {
            e.preventDefault();
            exportTableToPDF('.data-table', 'Inventory Report');
        };
    }

    const renderInventoryReportRow = (itemData) => {
        const newRow = document.createElement('tr');
        const purchasePrice = itemData.purchasePrice || 0;
        const stock = itemData.stock || 0;
        const totalValue = purchasePrice * stock;

        newRow.innerHTML = `
            <td>${itemData.name}</td>
            <td>${itemData.category || 'N/A'}</td>
            <td>${stock} Units</td>
            <td>₹ ${purchasePrice.toFixed(2)}</td>
            <td>₹ ${totalValue.toFixed(2)}</td>
        `;
        inventoryReportTableBody.appendChild(newRow);
        return totalValue;
    };

    const generateInventoryReport = async () => {
        inventoryReportTableBody.innerHTML = '';
        let grandTotal = 0;
        
        // 2. Fetch inventory ONLY from this shop's private folder
        const querySnapshot = await getDocs(collection(db, "shops", shopId, "inventory"));
        
        querySnapshot.forEach((doc) => {
            const itemValue = renderInventoryReportRow(doc.data());
            grandTotal += itemValue;
        });

        grandTotalEl.innerHTML = `<strong>₹ ${grandTotal.toFixed(2)}</strong>`;
    };

    generateInventoryReport();
};
const initProfitLossReportPage = async () => {
    const profitTableBody = document.querySelector('.data-table tbody');
    const grandTotalEl = document.getElementById('profit-grand-total');
    if (!profitTableBody || !grandTotalEl) return;

    // 1. Get the current Shop ID
    const shopId = getShopId();
    if (!shopId) return;

    // PDF Export Button
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.onclick = null; // Clear old listeners
        exportBtn.onclick = (e) => {
            e.preventDefault();
            exportTableToPDF('.data-table', 'Profit & Loss Report');
        };
    }

    const renderProfitRow = (productData) => {
        const newRow = document.createElement('tr');
        const grossProfit = productData.totalRevenue - productData.totalCost;
        newRow.innerHTML = `
            <td>${productData.name}</td>
            <td>₹ ${productData.totalRevenue.toFixed(2)}</td>
            <td>₹ ${productData.totalCost.toFixed(2)}</td>
            <td>₹ ${grossProfit.toFixed(2)}</td>
        `;
        profitTableBody.appendChild(newRow);
        return grossProfit;
    };

    const generateProfitLossReport = async () => {
        profitTableBody.innerHTML = '';
        let totalGrossProfit = 0;

        // 2. Fetch sales ONLY from this shop's private folder
        const salesSnapshot = await getDocs(collection(db, "shops", shopId, "sales"));
        const productData = new Map();

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const purchasePrice = item.purchasePrice || 0;
                    if (productData.has(item.name)) {
                        const existing = productData.get(item.name);
                        existing.totalRevenue += item.price * item.quantity;
                        existing.totalCost += purchasePrice * item.quantity;
                    } else {
                        productData.set(item.name, {
                            name: item.name,
                            totalRevenue: item.price * item.quantity,
                            totalCost: purchasePrice * item.quantity
                        });
                    }
                });
            }
        });

        const sortedProducts = Array.from(productData.values())
            .sort((a, b) => (b.totalRevenue - b.totalCost) - (a.totalRevenue - a.totalCost));

        sortedProducts.forEach(product => {
            const profit = renderProfitRow(product);
            totalGrossProfit += profit;
        });

        grandTotalEl.innerHTML = `<strong>₹ ${totalGrossProfit.toFixed(2)}</strong>`;
    };

    generateProfitLossReport();
};

const initSettingsPage = () => {
    const settingsForm = document.getElementById('settings-form');
    const shopkeeperNameInput = document.getElementById('shopkeeper-name-input');
    const shopNameInput = document.getElementById('shop-name-input');
    const loginPhoneInput = document.getElementById('login-phone-input');
    const loginPinInput = document.getElementById('login-pin-input');

    // 1. Point to the specific shop's folder
    const shopId = getShopId();
    const settingsDocRef = doc(db, "shops", shopId, "settings", "shopDetails");

    const fetchSettings = async () => {
        try {
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                const settings = docSnap.data();
                shopkeeperNameInput.value = settings.shopkeeperName || '';
                shopNameInput.value = settings.shopName || '';
                loginPhoneInput.value = settings.loginPhone || '';
                loginPinInput.value = settings.loginPin || '';
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    settingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newSettings = {
            shopkeeperName: shopkeeperNameInput.value,
            shopName: shopNameInput.value,
            loginPhone: loginPhoneInput.value,
            loginPin: loginPinInput.value,
            shopId: shopId // Keep the ID stored
        };

        try {
            // 2. Save changes ONLY to this shop's private folder
            await setDoc(settingsDocRef, newSettings, { merge: true });
            alert("Settings saved successfully!");
            
            // This refreshes the name in the header automatically
            loadGlobalData(); 
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Could not save settings.");
        }
    });

    fetchSettings();
};
const initAIAssistantPage = async () => {
    console.log("Initializing Genie Page...");
    const remindersFeed = document.getElementById('reminders-feed');
    const suggestionsFeed = document.getElementById('suggestions-feed');
    const genieSpinner = document.getElementById('genie-spinner');
    const aiChartCanvas = document.getElementById('aiChart');
    
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    let businessData = [];

    const createFeedMessage = (feed, iconClass, title, message, iconType = 'bell') => {
        const icons = {
            bell: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
            lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 9 8c0 1.3.5 2.6 1.5 3.5.7.8 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>`
        };

        const messageDiv = document.createElement('div');
        messageDiv.className = 'insight-message';
        messageDiv.innerHTML = `
            <div class="insight-icon ${iconClass}">
                ${icons[iconType]}
            </div>
            <div class="insight-content">
                <h5>${title}</h5>
                <p>${message}</p>
            </div>
        `;
        feed.appendChild(messageDiv);
    };
    
    const renderAIChart = (products) => {
        new Chart(aiChartCanvas, {
            type: 'bar',
            data: {
                labels: products.map(p => p.name),
                datasets: [
                    { label: 'Total Sales (₹)', data: products.map(p => p.totalRevenue), backgroundColor: '#1a73e8', yAxisID: 'y' },
                    { label: 'Current Stock Value (₹)', data: products.map(p => p.totalStockValue), backgroundColor: '#f9ab00', yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Sales (₹)' } },
                    y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Stock Value (₹)' }, grid: { drawOnChartArea: false } },
                }
            }
        });
    };

    const addChatMessage = (sender, message) => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = message;
        messageElement.appendChild(bubble);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const getSimulatedAIResponse = (userMessage, data) => {
        const message = userMessage.toLowerCase();
        
        const mentionedProduct = data.find(p => message.includes(p.name.toLowerCase()));

        if (message.includes("improve sales") && mentionedProduct) {
            const product = mentionedProduct;
            let suggestions = `To improve sales for <strong>${product.name}</strong>, you could try a few strategies:<br>`;
            suggestions += `<ul>`;
            if (product.quantitySold > 0) {
                const slowMovers = data.filter(p => p.quantitySold === 0 && p.stock > 0);
                if (slowMovers.length > 0) {
                    suggestions += `<li>Create a <strong>combo offer</strong>. Bundle ${product.name} with a slower-moving item like ${slowMovers[0].name}.</li>`;
                }
            }
            suggestions += `<li>Place it in a more <strong>visible location</strong> in your shop, like near the entrance or billing counter.</li>`;
            suggestions += `<li>If it's a new item, offer a small <strong>introductory discount</strong> for a limited time to encourage trial.</li>`;
            suggestions += `</ul>`;
            return suggestions;
        }

        if (message.includes("how can i improve") || message.includes("improve my business")) {
             const topProduct = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
             const slowMovers = data.filter(p => p.quantitySold === 0 && p.stock > 0);
             let advice = "Based on your data, here are a couple of general suggestions:<br>";
             advice += `<ul>`;
             advice += `<li>Your top product is <strong>${topProduct.name}</strong>. Make sure this is always well-stocked and visible.</li>`;
             if (slowMovers.length > 0) {
                advice += `<li>You have some items that haven't sold, like <strong>${slowMovers.map(p=>p.name).join(', ')}</strong>. Try offering a small discount or bundling them with popular items to clear stock.</li>`;
             }
             advice += `<li>Engage with your customers! Ask them for feedback on what they'd like to see in your store.</li>`;
             advice += `</ul>`;
             return advice;
        }

        if (message.includes("how many") && mentionedProduct && message.includes("sold")) {
            return `You have sold <strong>${mentionedProduct.quantitySold}</strong> units of ${mentionedProduct.name}.`;
        }
        
        if (message.includes("stock") && mentionedProduct) {
            return `There are <strong>${mentionedProduct.stock}</strong> units of ${mentionedProduct.name} currently in stock.`;
        }

        if (message.includes("top selling") || message.includes("best selling")) {
            const topProduct = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
            return `Your top-selling product by revenue is <strong>${topProduct.name}</strong>, which has generated ₹${topProduct.totalRevenue.toFixed(2)} in sales.`;
        }
        
        if (message.includes("low stock") || message.includes("running low")) {
            const lowStockItems = data.filter(p => p.stock > 0 && p.stock < 10);
            if (lowStockItems.length > 0) {
                return `The following items are low on stock: <strong>${lowStockItems.map(p => p.name).join(', ')}</strong>.`;
            }
            return "Great news! No items are currently low on stock.";
        }
        
        if (message.includes("profit") && mentionedProduct) {
             if (mentionedProduct.stock > 0 && mentionedProduct.quantitySold > 0) {
                const unitCost = mentionedProduct.totalStockValue / mentionedProduct.stock;
                const totalCostOfGoodsSold = unitCost * mentionedProduct.quantitySold;
                const profit = mentionedProduct.totalRevenue - totalCostOfGoodsSold;
                return `The estimated gross profit for the units sold of ${mentionedProduct.name} is <strong>₹${profit.toFixed(2)}</strong>.`;
             }
             if (mentionedProduct.quantitySold === 0) {
                return `I can't calculate the profit for ${mentionedProduct.name} as none have been sold yet.`;
             }
             return `I cannot accurately calculate the profit for ${mentionedProduct.name} as it is currently out of stock.`;
        }

        return "I can provide sales advice and data. Try asking 'How can I improve my business?' or 'How to improve sales of apples?'.";
    };

    const handleChatSubmit = (event) => {
        event.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        addChatMessage('user', userMessage);
        chatInput.value = '';
        genieSpinner.style.display = 'block';

        setTimeout(() => {
            genieSpinner.style.display = 'none';
            const simulatedResponse = getSimulatedAIResponse(userMessage, businessData);
            addChatMessage('genie', simulatedResponse);
        }, 1200);
    };

    chatForm.addEventListener('submit', handleChatSubmit);
    try {
        // 1. Get the unique Shop ID for the current session
        const shopId = getShopId();
        if (!shopId) return;

        // 2. Fetch data ONLY from this shop's private folders
        const [inventorySnapshot, salesSnapshot] = await Promise.all([
            getDocs(collection(db, "shops", shopId, "inventory")),
            getDocs(collection(db, "shops", shopId, "sales"))
        ]);

        const inventory = [];
        inventorySnapshot.forEach(doc => inventory.push({ id: doc.id, ...doc.data() }));

        const productAnalysis = new Map();
        inventory.forEach(item => {
            productAnalysis.set(item.name, {
                name: item.name,
                stock: item.stock,
                totalStockValue: (item.purchasePrice || 0) * item.stock,
                totalRevenue: 0,
                quantitySold: 0
            });
        });

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            if (sale.items) {
                sale.items.forEach(item => {
                    if (productAnalysis.has(item.name)) {
                        const existing = productAnalysis.get(item.name);
                        existing.totalRevenue += item.price * item.quantity;
                        existing.quantitySold += item.quantity;
                    }
                });
            }
        });

        businessData = Array.from(productAnalysis.values());
        
        // 3. Render charts and insights using the isolated shop data
        renderAIChart(businessData.filter(p => p.totalRevenue > 0 || p.totalStockValue > 0));
        
        remindersFeed.innerHTML = '';
        const lowStockItems = businessData.filter(p => p.stock > 0 && p.stock < 10);
        if (lowStockItems.length > 0) {
            const itemNames = lowStockItems.map(p => p.name).join(', ');
            createFeedMessage(remindersFeed, 'alert-icon', 'Low Stock Alert', `Consider reordering: <strong>${itemNames}</strong>.`, 'bell');
        } else {
             createFeedMessage(remindersFeed, '', 'Stock Levels OK', 'All products have sufficient stock levels.', 'bell');
        }
        
        genieSpinner.style.display = 'block';
        suggestionsFeed.innerHTML = '';
        setTimeout(() => {
            genieSpinner.style.display = 'none';
            // General suggestions for the specific shopkeeper
            createFeedMessage(suggestionsFeed, '', 'Inventory Insight', 'Check your Product Report to identify which items could be bundled for better sales.', 'lightbulb');
            createFeedMessage(suggestionsFeed, '', 'Growth Tip', 'Review your Customer insights to identify your most loyal shoppers.', 'lightbulb');
            addChatMessage('genie', 'Hello! I am Genie. I have analyzed your shop data. Ask me anything about your sales, inventory, or customers!');
        }, 2000);

    } catch (mainError) {
        console.error("Error loading initial page data:", mainError);
        aiChartCanvas.style.display = 'none';
        remindersFeed.innerHTML = '';
        createFeedMessage(remindersFeed, 'alert-icon', 'Error', 'Could not load page data.', 'bell');
    }
};

document.addEventListener("click", (e) => {
    if(e.target.id === "logout-btn"){
        localStorage.removeItem("loggedIn");
        window.location.href = "index.html";
    }
});

