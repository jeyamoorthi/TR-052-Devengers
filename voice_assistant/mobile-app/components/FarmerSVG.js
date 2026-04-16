import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Ellipse, G } from 'react-native-svg';

export default function FarmerSVG({ width, height }) {
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={width * 0.9}
        height={height * 0.9}
        viewBox="0 0 300 400"
      >
        {/* Background Circle */}
        <Circle
          cx="150"
          cy="200"
          r="140"
          fill="rgba(82, 192, 96, 0.1)"
          stroke="rgba(82, 192, 96, 0.3)"
          strokeWidth="2"
        />

        {/* Farmer Body */}
        <G>
          {/* Head */}
          <Circle cx="150" cy="120" r="35" fill="#f4c7a0" stroke="#d4a373" strokeWidth="2" />

          {/* Hair */}
          <Path
            d="M120 100 Q150 70 180 100 Q190 120 185 140 Q150 130 115 140 Q110 120 120 100 Z"
            fill="#4a3728"
            stroke="#3a2718"
            strokeWidth="1"
          />

          {/* Face Features */}
          <Circle cx="138" cy="115" r="3" fill="#2c3e50" />
          <Circle cx="162" cy="115" r="3" fill="#2c3e50" />
          <Path
            d="M142 128 Q150 133 158 128"
            stroke="#e74c3c"
            strokeWidth="2"
            fill="none"
          />

          {/* Body */}
          <Path
            d="M130 155 Q150 145 170 155 L175 250 L125 250 Z"
            fill="#2d7a3a"
            stroke="#1e5c29"
            strokeWidth="2"
          />

          {/* Sari/Dress Detail */}
          <Path
            d="M125 200 Q150 190 175 200"
            stroke="#f0b429"
            strokeWidth="3"
            fill="none"
          />
          <Path
            d="M125 220 Q150 210 175 220"
            stroke="#f0b429"
            strokeWidth="3"
            fill="none"
          />

          {/* Arms */}
          <Path
            d="M125 170 Q100 200 95 230"
            stroke="#f4c7a0"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M175 170 Q200 200 205 230"
            stroke="#f4c7a0"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />

          {/* Hands */}
          <Circle cx="95" cy="235" r="8" fill="#f4c7a0" stroke="#d4a373" strokeWidth="1" />
          <Circle cx="205" cy="235" r="8" fill="#f4c7a0" stroke="#d4a373" strokeWidth="1" />

          {/* Legs */}
          <Path
            d="M135 250 L130 320"
            stroke="#f4c7a0"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M165 250 L170 320"
            stroke="#f4c7a0"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />

          {/* Feet */}
          <Ellipse cx="128" cy="325" rx="12" ry="6" fill="#8b5e3c" />
          <Ellipse cx="172" cy="325" rx="12" ry="6" fill="#8b5e3c" />

          {/* Farming Tool (Hoe) */}
          <G>
            <Path
              d="M205 230 L230 180"
              stroke="#8b5e3c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Path
              d="M225 175 L240 165 L235 180 Z"
              fill="#95a5a6"
              stroke="#7f8c8d"
              strokeWidth="1"
            />
          </G>
        </G>
      </Svg>
    </View>
  );
}
