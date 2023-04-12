/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product',
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice: '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
    
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    
    cart: {
      wrapperActive: 'active',
    },
    
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    }, 
    
    cart: {
      defaultDeliveryFee: 20,
    },
    db: {
      url: '//localhost:3131',
      products: 'products',
      orders: 'orders',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
    
    cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
  };


  class Product {
    constructor(id, data){
      const thisProduct = this;
      thisProduct.id = id;
      thisProduct.data = data;
      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();

    }

    renderInMenu(){
      const thisProduct = this;

      /* generate HTML based on temple */
      const generatedHTML = templates.menuProduct(thisProduct.data);
      /*create element using utils.createElementFromHtml */
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);
      /* find menu container */
      const menuContainer = document.querySelector(select.containerOf.menu);
      /* add element to menu */
      menuContainer.appendChild(thisProduct.element);
    }

    getElements(){
      const thisProduct = this;
    
      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }
    
    initAmountWidget(){
      const thisProduct = this;
      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
      thisProduct.amountWidgetElem.addEventListener('updated', function(){
        thisProduct.processOrder();
      });
    }

    
    initAccordion(){
      const thisProduct = this;

      /* find the clickable trigger (the element that should react to clicking) */
      /* const clickableTrigger = thisProduct.element.querySelector(select.menuProduct.clickable); */
      
      /* START: add event listener to click able trigger on event click */
      thisProduct.accordionTrigger.addEventListener('click', function(){
      
        /* prevent default action fo event */
        event.preventDefault();

        /* find active product (product that has active class) */
        const actProduct = document.querySelector(select.all.menuProductsActive);
        
        /* if there is active product and it's not thisProduct.element, remove class activ from it */
        if(actProduct && actProduct != thisProduct.element){
          actProduct.classList.remove(select.all.menuProductsActive);
        }
        /* toogle active class on thisProduct.element */
        thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);
      });
    }

    initOrderForm(){
      const thisProduct = this;
      thisProduct.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });
      for (let input of thisProduct.formInputs){
        input.addEventListener('change', function(){
          thisProduct.processOrder();
        });
      }
      thisProduct.cartButton.addEventListener('click', function(event){
        event.preventDefault();
        thisProduct.processOrder();
        thisProduct.addToCart();
      });
    }

    processOrder() {
      const thisProduct = this;
    
      // covert form to object structure e.g. { sauce: ['tomato'], toppings: ['olives', 'redPeppers']}
      const formData = utils.serializeFormToObject(thisProduct.form);
    
      // set price to default price
      let price = thisProduct.data.price;
    
      // for every category (param)...
      for(let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkboxes'... }
        const param = thisProduct.data.params[paramId];
    
        // for every option in this category
        for(let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];


          // check if there is param with a name of paramId in formData and if it includes optionId
          if(formData[paramId] && formData[paramId].includes(optionId)) {
          // check if the option is not default
            if(!option.default) {
            // add option price to price variable
              price += option.price;
            }
          } else {
            // check if the option is default
            if(option.default) {
              // reduce price variable
              price -= option.price;
            }
          }
          // finde image based on class selector .paramId-optionId 
          const optionImage = thisProduct.imageWrapper.querySelector('.'+ paramId + '-' + optionId);
          
          // if optionImage contains properly selector 
          if(optionImage) {
            // and option is marked
            if(formData[paramId] && formData[paramId].includes(optionId)) {
              optionImage.classList.add(classNames.menuProduct.imageVisible);
            } else {
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
        }
      }
      thisProduct.priceSingle = price;
      /* multiply price by amount */
      price *= thisProduct.amountWidget.value;
      // update calculated price in the HTML
      thisProduct.priceElem.innerHTML = price;
    }
    addToCart(){
      const thisProduct = this;

      app.Cart.add(thisProduct.prepareCartProduct());
    }

    prepareCartProduct(){
      const thisProduct = this;

      const productSummary = {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.priceSingle * thisProduct.amountWidget.value,
        params: thisProduct.prepareCartProductParams(),
      };
      return(productSummary);
    }

    prepareCartProductParams() {
      const thisProduct = this;
    
      const formData = utils.serializeFormToObject(thisProduct.form);
      const params = {};
    
      // for very category (param)
      for(let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];
    
        // create category param in params const eg. params = { ingredients: { name: 'Ingredients', options: {}}}
        params[paramId] = {
          label: param.label,
          options: {},
        };
    
        // for every option in this category
        for(let optionId in param.options) {
          const option = param.options[optionId];
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);
    
          if(optionSelected) {
            // option is selected!
            params[paramId].options[optionId] = option.label;
          }
        }
      }
    
      return params;
    }
  }

  class AmountWidget {
    constructor(element){
      const thisWidget = this;
      thisWidget.getElements(element);
      thisWidget.setValue(settings.amountWidget.defaultValue);
      thisWidget.initActions();
    }
    getElements(element){
      const thisWidget = this;
      
      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
      thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
      thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
    }
    setValue(value){
      const thisWidget = this;

      const newValue = parseInt(value);

      /* TODO add validation */
      if(thisWidget.value !== newValue && !isNaN(newValue) && newValue >= settings.amountWidget.defaultMin && newValue <= settings.amountWidget.defaultMax){
        thisWidget.value = newValue;
      }
      thisWidget.announce();
      thisWidget.input.value = thisWidget.value;
    }
    initActions(){
      const thisWidget = this;
      thisWidget.input.addEventListener('change', function(){
        thisWidget.setValue(thisWidget.input.value);
      });
      thisWidget.linkDecrease.addEventListener('click', function(event){
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);
      });
      thisWidget.linkIncrease.addEventListener('click', function(event){
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);
      });
    }

    announce(){
      const thisWidget = this;

      const event = new CustomEvent('updated', {bubbles: true});
      thisWidget.element.dispatchEvent(event);
    }
  }

  class Cart {
    constructor(element){
      const thisCart = this;

      thisCart.products = [];
      
      
      thisCart.getElements(element);
      thisCart.initActions();
      
    }

    getElements(element){
      const thisCart = this;

      thisCart.dom = {};

      thisCart.dom.wrapper = element;
      thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(select.cart.toggleTrigger);
      thisCart.dom.productList = thisCart.dom.wrapper.querySelector(select.cart.productList);
      thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(select.cart.deliveryFee);
      thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(select.cart.subtotalPrice);
      thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(select.cart.totalNumber);
      thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(select.cart.totalPrice);
      thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
      thisCart.dom.phone = thisCart.dom.wrapper.querySelector(select.cart.phone);
      thisCart.dom.address = thisCart.dom.wrapper.querySelector(select.cart.address);
    }

    initActions(){
      const thisCart = this;
      thisCart.dom.toggleTrigger.addEventListener('click', function(){
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });
      thisCart.dom.productList.addEventListener('updated', function(){
        thisCart.update();
      });
      thisCart.dom.productList.addEventListener('remove', function(){
        thisCart.remove(event.detail.cartProduct);
      });
      thisCart.dom.form.addEventListener('submit', function(){
        event.preventDefault();
        thisCart.sendOrder();
      });
    }

    add(menuProduct){
      const thisCart = this;
      /* generate HTML based on temple */
      const generatedHTML = templates.cartProduct(menuProduct);
      /*create element using utils.createElementFromHtml */
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      /* add element to menu */
      thisCart.dom.productList.appendChild(generatedDOM);

      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
      thisCart.update();
    }

    update(){
      const thisCart = this;

      const deliveryFee = settings.cart.defaultDeliveryFee;
      thisCart.totalNumber = 0;
      thisCart.subtotalPrice = 0;
      

      //start LOOP in thisCart.products
      for(let product of thisCart.products){
        thisCart.totalNumber += product.amount;
        thisCart.subtotalPrice += product.price;
      }
      
      //if cart contains order add delivery fee
      if(thisCart.subtotalPrice != 0){
        thisCart.totalPrice = thisCart.subtotalPrice + deliveryFee;
      } else{
        thisCart.totalPrice = 0;
      }
      thisCart.dom.subtotalPrice.innerHTML = thisCart.subtotalPrice;
      thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;
      thisCart.dom.deliveryFee.innerHTML = deliveryFee;

      for (let item of thisCart.dom.totalPrice){
        item.innerHTML = thisCart.totalPrice;
      }
    }
    remove(cartProduct){
      const thisCart = this;
      /* Finding HTML element that represent product and remove it from the DOM*/
      cartProduct.dom.wrapper.remove();
      /* Find the index of cartProduct object in 'products' array of the 'thisCart' */
      const productIndex = thisCart.products.indexOf(cartProduct);
      /* Removing object from 'products' using splice() method */
      thisCart.products.splice(productIndex);
      /* Calling update methor to update cart after removing product */
      thisCart.update();
    }
    sendOrder(){
      const thisCart = this;
      const url = settings.db.url + '/' + settings.db.orders;

      const payload = {
        adress: thisCart.dom.address.value,
        phone: thisCart.dom.phone.value,
        totalPrice: thisCart.totalPrice,
        subtotalPrice: thisCart.subtotalPrice,
        totalNumber: thisCart.totalNumber,
        deliveryFee: thisCart.deliveryFee,
        products:[]
      };

      for(let prod of thisCart.products) {
        payload.products.push(prod.getData());
      }

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };
      
      fetch(url, options)
        .then(function(response){
          return response.json();
        }).then(function(parsedResponse){
          console.log('parsedResponse', parsedResponse);
        });

    }
  
  }

  class CartProduct {
    constructor(menuProduct, element){
      const thisCartProduct = this;
      thisCartProduct.id = menuProduct.id;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.params = menuProduct.params;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();
      

    }
    getElements(element) {
      const thisCartProduct = this;

      thisCartProduct.dom = {};
      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.amountWidget);
      thisCartProduct.dom.price = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.price);
      thisCartProduct.dom.edit = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.edit);
      thisCartProduct.dom.remove = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.remove);
    }

    initAmountWidget(){
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(thisCartProduct.dom.amountWidget);

      thisCartProduct.dom.amountWidget.addEventListener('updated', function(){
        
        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        thisCartProduct.price = thisCartProduct.amount * thisCartProduct.priceSingle;
        
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
        
      });
    }
    remove(){
      const thisCartProduct = this;

      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });
      thisCartProduct.dom.wrapper.dispatchEvent(event);
    }

    initActions(){
      const thisCartProduct = this;

      thisCartProduct.dom.edit.addEventListener('click', function(){
        event.preventDefault();
      });
      thisCartProduct.dom.remove.addEventListener('click', function(){
        event.preventDefault();
        thisCartProduct.remove();
      });

    }
    getData(){
      const thisCartProduct = this;
      const productsSummary = {
        id: thisCartProduct.id,
        amount: thisCartProduct.amount,
        price: thisCartProduct.price,
        priceSingle: thisCartProduct.priceSingle,
        name: thisCartProduct.name,
        params: thisCartProduct.params,
      };
      return(productsSummary);
    }
  }

  const app = {
    initMenu: function(){
      const thisApp = this;
      for(let productData in thisApp.data.products){
        new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
      }
    },
    initData: function(){
      const thisApp = this;

      thisApp.data = {};
      const url = settings.db.url + '/' + settings.db.products;

      fetch(url)
        .then(function(rawResponse){
          return rawResponse.json();
        })
        .then(function(parasedResponse){
          console.log('parasedResponse', parasedResponse);

          /* save parasedResponse as thisApp.data products */
          thisApp.data.products = parasedResponse;
          /* execute initMenu method */
          thisApp.initMenu();
        });
    },
    init: function(){
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);
      thisApp.initData();
      
    },
    initCart: function(){
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.Cart = new Cart(cartElem);
    }
  };

  
  app.init();
  app.initCart();
}
