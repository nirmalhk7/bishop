import {IsNumber, IsString, Max, Min } from 'class-validator';

export class LocationPredictionDto {
    @IsString()
    userId: string = '';

    @IsNumber()
    timestamp: number = 0;
}

export class LocationDataDto {
    @IsString()
    userId: string = '';

    @IsNumber() 
    @Min(-90)
    @Max(90)
    latitude: number = 0;

    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number = 0;

    @IsNumber()
    timestamp: number = 0;
}
