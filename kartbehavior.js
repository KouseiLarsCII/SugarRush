// kartbehavior.js - AI Control & Realistic Wheel Dynamics

window.initKartBehavior = function(aiCars) {
  if (!aiCars || !Array.isArray(aiCars)) return;

  aiCars.sort(() => Math.random() - 0.5);

  aiCars.forEach((ai) => {
    ai.clumsinessTimer = Math.random() * 100;
    ai.unpredictableOffset = 0;
    
    ai.baseSpeedSetting = 0.00034 + (Math.random() * 0.00012);
    ai.surgeTimer = Math.random() * 200;
    ai.surgeDuration = 0;
    ai.isSurging = false;
    ai.isWeakening = false;

    ai.speed = ai.baseSpeedSetting;
    ai.laneShiftAggression = 0.05;
    
    ai.lap = 1;
    ai.finished = false;
    ai.lastPos = ai.mesh ? ai.mesh.position.clone() : new THREE.Vector3();
  });
};

window.updateKartBehavior = function(aiCars, trackCurve, TOTAL_LAPS, playerProgress) {
  if (!aiCars || !Array.isArray(aiCars)) return;

  aiCars.forEach((ai) => {
    if (ai.finished) return;

    if (ai.u < 0.015 && typeof countdownValue !== 'undefined' && countdownValue >= 0) {
      ai.speed = 0;
      return;
    }

    ai.surgeTimer++;

    if (!ai.isSurging && !ai.isWeakening && ai.surgeTimer > 180 + (Math.random() * 220)) {
      ai.surgeTimer = 0;
      const roll = Math.random();
      
      if (roll < 0.55) {
        ai.isSurging = true;
        ai.surgeDuration = 100 + Math.random() * 120;
      } else if (roll < 0.85) {
        ai.isWeakening = true;
        ai.surgeDuration = 120 + Math.random() * 140;
      }
    }

    if (ai.isSurging || ai.isWeakening) {
      ai.surgeDuration--;
      if (ai.surgeDuration <= 0) {
        ai.isSurging = false;
        ai.isWeakening = false;
      }
    }

    let targetSpeed = ai.baseSpeedSetting;

    if (ai.isSurging) {
      targetSpeed = 0.00058 + (Math.random() * 0.00009);
    } else if (ai.isWeakening) {
      targetSpeed = 0.00020 + (Math.random() * 0.00005);
    } else {
      targetSpeed += (Math.random() - 0.5) * 0.00007;
    }

    ai.speed += (targetSpeed - ai.speed) * 0.06;
    ai.speed = Math.max(0.00015, Math.min(0.00072, ai.speed));

    const prevU = ai.u;
    ai.u = (ai.u + ai.speed) % 1.0;

    if (prevU > 0.80 && ai.u < 0.20) {
      ai.lap++;
      if (ai.lap > TOTAL_LAPS && !ai.finished) {
        ai.finished = true;
        ai.lap = TOTAL_LAPS;
        if (typeof window.recordFinish === 'function') {
          window.recordFinish({ name: ai.name, isPlayer: false });
        }
      }
    }
    ai.lastU = ai.u;

    ai.clumsinessTimer++;
    if (ai.clumsinessTimer > 150 + (Math.random() * 100)) {
      ai.clumsinessTimer = 0;
      if (Math.random() < 0.45) {
        ai.unpredictableOffset = (Math.random() - 0.5) * 3.5;
      } else {
        ai.unpredictableOffset = 0;
      }
    }

    let targetLaneWithChaos = (ai._targetLane || 0) + ai.unpredictableOffset;
    targetLaneWithChaos = Math.max(-4.0, Math.min(4.0, targetLaneWithChaos));
    
    ai.offsetLane += (targetLaneWithChaos - ai.offsetLane) * 0.05;

    const pt = trackCurve.getPointAt(ai.u);
    const aiTangent = trackCurve.getTangentAt(ai.u).normalize();
    const side = new THREE.Vector3().crossVectors(aiTangent, new THREE.Vector3(0, 1, 0)).normalize();

    const targetPos = pt.clone().add(side.multiplyScalar(ai.offsetLane));
    
    // Update position and rotation smoothly
    ai.mesh.position.set(targetPos.x, 0.0, targetPos.z);
    ai.mesh.lookAt(targetPos.clone().add(aiTangent));

    // Animate AI Wheels (Steering & Rolling)
    if (ai.mesh && ai.mesh.userData) {
      const movementDelta = ai.mesh.position.distanceTo(ai.lastPos);
      ai.lastPos.copy(ai.mesh.position);

      // Estimate steering angle safely based on lane changes
      const targetLane = ai._targetLane !== undefined ? ai._targetLane : ai.offsetLane;
      const steeringAngle = THREE.MathUtils.clamp((targetLane - ai.offsetLane) * 0.4, -0.6, 0.6);

      if (ai.mesh.userData.frontLeftPivot && ai.mesh.userData.frontRightPivot) {
        ai.mesh.userData.frontLeftPivot.rotation.y = THREE.MathUtils.lerp(
          ai.mesh.userData.frontLeftPivot.rotation.y, 
          steeringAngle, 
          0.2
        );
        ai.mesh.userData.frontRightPivot.rotation.y = THREE.MathUtils.lerp(
          ai.mesh.userData.frontRightPivot.rotation.y, 
          steeringAngle, 
          0.2
        );
      }

      // Safe rolling delta matching geometry orientation
      const rollDelta = movementDelta * 8.0;
      ['frontLeftWheel', 'frontRightWheel', 'rearLeftWheel', 'rearRightWheel'].forEach(wheelKey => {
        if (ai.mesh.userData[wheelKey]) {
          ai.mesh.userData[wheelKey].rotation.x += rollDelta;
        }
      });
    }
  });
};