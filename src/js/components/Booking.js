import {select, templates, settings, classNames} from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element){
    const thisBooking = this;
    thisBooking.markedTables = '';
    thisBooking.render(element);
    thisBooking.initWidget();
    thisBooking.getData();
    
  
    
  
  }

  getData(){
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsReapeat: [
        settings.db.repeatParam,
        endDateParam,
      ]
    };


    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsReapeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsReapeat.join('&'),
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsReapeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponses = allResponses[1];
        const eventsRepeatResponses = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponses.json(),
          eventsRepeatResponses.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsReapeat]){
        
        thisBooking.paraseData(bookings, eventsCurrent, eventsReapeat);
      });
  }

  paraseData(bookings, eventsCurrent, eventsReapeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsReapeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    
    thisBooking.updateDOM();
    //console.log('dareczek', thisBooking.markedTables);
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);


    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      
      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }
  
      thisBooking.booked[date][hourBlock].push(table);

    }
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);
    

    let allAvailable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);

      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  

  render(element){
    const thisBooking = this;

    /* generate HTML based on temple */
    const generatedHTML = templates.bookingWidget();
    
    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = document.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = document.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = document.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = document.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);

    /* select div with table */
    thisBooking.dom.divTables = document.querySelector(select.booking.table);
    

  }

  initWidget(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.peopleAmount.addEventListener('updated', function(){
      thisBooking.resetGreenTables();
    });

    thisBooking.dom.hoursAmount.addEventListener('updated', function(){
      thisBooking.resetGreenTables();
    });

    thisBooking.dom.datePicker.addEventListener('updated', function(){
      thisBooking.resetGreenTables();
    });

    thisBooking.dom.hourPicker.addEventListener('updated', function(){
      thisBooking.resetGreenTables();
    });

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });
    /* add event listener for div with tables */
    thisBooking.dom.divTables.addEventListener('click', function(event){
      event.preventDefault();
      thisBooking.initTables(event);
    });
  }


  initTables(event){
    const thisBooking = this;
    thisBooking.clickedElement = event.target;

    // Check that clickedElement contains class table
    if(thisBooking.clickedElement.classList.contains(classNames.booking.table)){

      // get Id of the clickedElement
      const tableId = thisBooking.clickedElement.getAttribute(settings.booking.tableIdAttribute);

      // check if any table contains class 'checked' and const markedTable not equels 0
      if(thisBooking.markedTables != 0 && thisBooking.clickedElement.classList.contains(classNames.booking.checked)){
        thisBooking.clickedElement.classList.remove(classNames.booking.checked);
        thisBooking.markedTables = 0;
      }
      // if table is booked
      else if (thisBooking.clickedElement.classList.contains(classNames.booking.tableBooked)){
        alert('Stolik niedostępny!');
      }
      // Check if the table is marked
      else if (thisBooking.clickedElement.classList.contains(classNames.booking.checked)){

        //remove the "checked" class
        thisBooking.clickedElement.classList.remove(classNames.booking.checked);
      }
      else {
        for(let table of thisBooking.dom.tables){

          // If any table is marked
          if(table.classList.contains(classNames.booking.checked)){

            // Remove class checked
            table.classList.remove(classNames.booking.checked);
          }
        }
        // And add class 'checked' to clicked table
        thisBooking.clickedElement.classList.add(classNames.booking.checked);
        thisBooking.markedTables = tableId;

      }
    }
  }
  //function to remove class checked while picker is using
  resetGreenTables(){
    const thisBooking = this;
    
    for(let greenTable of thisBooking.dom.tables){
    
      if(greenTable.classList.contains(classNames.booking.checked)){
        greenTable.classList.remove(classNames.booking.checked);
      }
    }
    
  }
  
}
export default Booking;
