import React from 'react';
import { getStates, getCities,getPincodes}  from '../src/pages/api';

const Pincode=()=>{
    const [states,setStates]=React.useState([]);
    const [cities,setCities]=React.useState([]);
    const [pincodes,setPincodes]=React.useState([]);

    React.useEffect(()=> {
        fetchStates();
    },[]);

    const fetchStates=async()=>{
        const data=await getStates();
        setStates(data);
    };

    const fetchCities=async(statesSelected)=>{
        const data=await getCities(statesSelected);
        setCities(data);
    }
}