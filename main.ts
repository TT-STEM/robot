/**
 * Control for Legged Robot Users.
 */
//% weight=11 color=#DF6721 icon="\uf188" block="Legged Robot"
//% groups='["Legs", "Actions", "Servos"]'
namespace Legged_Robot
{	
    //Constants 
    let PRESCALE_REG = 0xFE //the prescale register address
    let MODE_1_REG = 0x00  //The mode 1 register address
    
    // If you wanted to write some code that stepped through the servos then this is the Base and size to do that 	
    let SERVO_1_REG_BASE = 0x08 
    let SERVO_REG_DISTANCE = 4
    
    //To get the PWM pulses to the correct size and zero offset these are the default numbers. 
    let SERVO_MULTIPLIER = 189 //226 for FS90, 188 for SG90
    let SERVO_ZERO_OFFSET = 0x66

    // List of servos for the servo block to use. These represent register offsets in the PCA9865 driver IC.
    export enum Servos {
        //% block="SV1"
        Servo1 = 0x08,
        //% block="SV2"
        Servo2 = 0x0C,
        //% block="SV3"
        Servo3 = 0x10,
        //% block="SV4"
        Servo4 = 0x14,
        //% block="SV5"
        Servo5 = 0x18,
        //% block="SV6"
        Servo6 = 0x1C,
        //% block="SV7"
        Servo7 = 0x20,
        //% block="SV8"
        Servo8 = 0x24
    }

    // Leg Choices.
    export enum Legs {
        //% block="Front Left"
        FRONT_LEFT,
        //% block="Front Right"
        FRONT_RIGHT,
        //% block="Back Left"
        BACK_LEFT,
        //% block="Back Right"
        BACK_RIGHT
    }
	
    // Leg Part Choices.
    export enum Parts {
        //% block="Upper"
        UPPER,
        //% block="Lower"
        LOWER
    }
	
    // Angle Choices.
    export enum Angles {
        //% block="30°"
        DEG30 = 30,
        //% block="45°"
        DEG45 = 45,
        //% block="60°"
        DEG60 = 60,
        //% block="75°"
        DEG75 = 75,
        //% block="90°"
        DEG90 = 90,
        //% block="105°"
        DEG105 = 105,
        //% block="120°"
        DEG120 = 120,
        //% block="135°"
        DEG135 = 135,
        //% block="150°"
        DEG150 = 150
    }
	
    // The Robotics board can be configured to use different I2C addresses, these are all listed here.
    // Board1 is the default value (set as the CHIP_ADDRESS)
    export enum BoardAddresses{
        Board1 = 0x6C,
        Board2 = 0x6D,
        Board3 = 0x6E,
        Board4 = 0x6F
    }

    // chipAddress can be changed in 'JavaScript' mode if the I2C address of the board has been altered:
    export let chipAddress = BoardAddresses.Board1 
    
    let initalised = false //a flag to allow us to initialise without explicitly calling the secret incantation

    /**
     * Initialise I2C chip
     */
    function I2cInit(): void {
        let buf = pins.createBuffer(2)

        //Should probably do a soft reset of the I2C chip here when I figure out how

        // First set the prescaler to 50 hz
        buf[0] = PRESCALE_REG
        buf[1] = 0x85 //50Hz
        pins.i2cWriteBuffer(chipAddress, buf, false)

        //Block write via the all leds register to turn off all servo outputs
        buf[0] = 0xFA
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = 0xFB
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = 0xFC
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = 0xFD
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)

        //Set the mode 1 register to come out of sleep
        buf[0] = MODE_1_REG
        buf[1] = 0x01
        pins.i2cWriteBuffer(chipAddress, buf, false)

        //set the initalised flag so we dont come in here again automatically
        initalised = true
    }
	
    /**
     * Sets specified servo to a requested position.
     */
    //% subcategory=more
    //% group=Servos
    //% blockId=robot_setServo
    //% block="Servo|%Servo|degree|%degrees|"
    //% weight=100 blockGap=15
    //% degrees.min=0 degrees.max=180
    export function setServo(servo: Servos, degrees: number): void {
        if (initalised == false) {
            I2cInit()
        }
        let buf = pins.createBuffer(2)
        let highByte = false
        let deg100 = degrees * 100
        let pwmVal100 = deg100 * SERVO_MULTIPLIER
        let pwmVal = pwmVal100 / 10000
        pwmVal = Math.floor(pwmVal)
        pwmVal = pwmVal + SERVO_ZERO_OFFSET
        if (pwmVal > 0xFF) {
            highByte = true
        }
        buf[0] = servo
        buf[1] = pwmVal
        pins.i2cWriteBuffer(chipAddress, buf, false)
        if (highByte) {
            buf[0] = servo + 1
            buf[1] = 0x01
        }
        else {
            buf[0] = servo + 1
            buf[1] = 0x00
        }
        pins.i2cWriteBuffer(chipAddress, buf, false)
    }
    
    /**
     * Turns off specified servo.     
     */
    //% subcategory=more
    //% group=Servos
    //% blockId=robot_stopServo
    //% weight=99 blockGap=15
    //%block="Servo|%servo|Release"
    export function stopServo(servo: Servos): void {
        let buf = pins.createBuffer(2)
        
        buf[0] = servo
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = servo + 1
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
    }
    
    /**
     * Turns off all servos.
     */
    //% subcategory=more
    //% group=Servos
    //% blockId=robot_stopAllServos
    //% weight=98 blockGap=15
    //%block="Servo Release All"
    export function stopAllServos(): void {
        let buf = pins.createBuffer(2)
        let servoOffCount = 0
        let servoStartReg = Servos.Servo1
        let servoRegCount = 0

        while (servoOffCount < 8) {
            buf[0] = servoStartReg + servoRegCount
            buf[1] = 0x00
            pins.i2cWriteBuffer(chipAddress, buf, false)
            buf[0] = servoStartReg + servoRegCount + 1
            buf[1] = 0x00
            pins.i2cWriteBuffer(chipAddress, buf, false)

            servoRegCount += 4
            servoOffCount += 1
        }
    }

    /**
     * Sets specified robot part to a requested angle.
     */
    //% group=Legs
    //% blockId=robot_setLegPartAngle
    //% block="Leg|%leg|Part|%part|to|%angle|"
    //% weight=100 blockGap=15
    export function setLegPartAngle(leg: Legs, part: Parts, angle: Angles): void {
        if (initalised == false) {
            I2cInit()
        }
        switch (leg) {
            case Legs.FRONT_LEFT:
                if (part == Parts.UPPER) {
                    setServo(Servos.Servo6, angle)
                }
                else {
                    setServo(Servos.Servo5, angle)
                }
                break
            case Legs.FRONT_RIGHT:
                if (part == Parts.UPPER) {
                    setServo(Servos.Servo7, angle)
                }
                else {
                    setServo(Servos.Servo8, angle)
                }
                break
            case Legs.BACK_LEFT:
                if (part == Parts.UPPER) {
                    setServo(Servos.Servo2, angle)
                }
                else {
                    setServo(Servos.Servo1, angle)
                }
                break
            case Legs.BACK_RIGHT:
                if (part == Parts.UPPER) {
                    setServo(Servos.Servo3, angle)
                }
                else {
                    setServo(Servos.Servo4, angle)
                }
                break
        }
    }
    /**
     * Make robot stand.
     */
    //% group=Actions
    //% blockId=robot_stand
    //% block="Stand"
    //% weight=100 blockGap=15
    export function stand(): void {
        if (initalised == false) {
            I2cInit()
        }
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG90)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG90)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG90)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG90)
        setLegPartAngle(Legs.BACK_LEFT, Parts.UPPER, Angles.DEG90)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.UPPER, Angles.DEG90)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.UPPER, Angles.DEG90)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.UPPER, Angles.DEG90)
    }
	
    /**
     * Make robot step forawrd.
     */
    //% group=Actions
    //% blockId=robot_stepForward
    //% block="Step Forward"
    //% weight=99 blockGap=15
    export function stepForward(): void {
        if (initalised == false) {
            I2cInit()
        }
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG150)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.UPPER, Angles.DEG150)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG150)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.UPPER, Angles.DEG150)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.UPPER, Angles.DEG150)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.UPPER, Angles.DEG90)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.UPPER, Angles.DEG150)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.UPPER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG150)
        setLegPartAngle(Legs.BACK_LEFT, Parts.UPPER, Angles.DEG30)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG150)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.UPPER, Angles.DEG30)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.UPPER, Angles.DEG90)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.UPPER, Angles.DEG90)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.UPPER, Angles.DEG30)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.UPPER, Angles.DEG30)
        basic.pause(100)
    }
	
    /**
     * Make robot turn left.
     */
    //% group=Actions
    //% blockId=robot_turnLeft
    //% block="Turn Left"
    //% weight=98 blockGap=15
    export function turnLeft(): void {
        if (initalised == false) {
            I2cInit()
        }
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.BACK_LEFT, Parts.UPPER, Angles.DEG135)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.UPPER, Angles.DEG135)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.UPPER, Angles.DEG135)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.UPPER, Angles.DEG135)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        stand()
        basic.pause(100)
    }
	
    /**
     * Make robot turn right.
     */
    //% group=Actions
    //% blockId=robot_turnRight
    //% block="Turn Right"
    //% weight=97 blockGap=15
    export function turnRight(): void {
        if (initalised == false) {
            I2cInit()
        }
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.UPPER, Angles.DEG45)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_RIGHT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.BACK_LEFT, Parts.UPPER, Angles.DEG45)
        basic.pause(100)
        setLegPartAngle(Legs.BACK_LEFT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.UPPER, Angles.DEG45)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_LEFT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG120)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.UPPER, Angles.DEG45)
        basic.pause(100)
        setLegPartAngle(Legs.FRONT_RIGHT, Parts.LOWER, Angles.DEG90)
        basic.pause(100)
        stand()
        basic.pause(100)
    }
}
