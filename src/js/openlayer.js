/* eslint-disable */
import { colors, path, zIndex } from './config';

import 'ol/ol.css';
import { Map, View } from 'ol';
import TileArcGISRest from 'ol/source/TileArcGISRest';
// import TileLayer from 'ol/layer/Tile';
import Feature from 'ol/Feature';
import Circle from 'ol/geom/Circle';
// import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import {fromLonLat, get} from 'ol/proj';
import LineString from 'ol/geom/LineString';
import {Vector as VectorSource} from 'ol/source';
import {Icon, Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {Draw, Modify, Select, Snap} from 'ol/interaction';

var events = require("events");
var eventEmitter = new events.EventEmitter(); //用来和vue组件通信

export default class map {
  constructor(dom) {
    this.map = null;  //地图实例
    this.view = null; //视角实例
    this.vehilce = null; //车的实例
    this.greenLine = null; //还未行驶的路径
    this.layers = []; //层 集合

    this.animation = {
      path: [],//行驶路径
      currentLocation: [],//车辆当前位置
      speed: 1,//每次跳转步长
      animationTimer: null,
      viewLock: false,//动画的时候是否要锁定镜头
      locationIndex: -1, //车辆位置在路径数组中的index
      time: 0 //时间进度条中的值  (1/100)
    }

    this.view = new View({
      projection: 'EPSG:4326',
      center: [120.164839,30.228857],
      zoom: 11,
      crossOrigin: '',
    })
    this.map = new Map({
      target: dom,
      layers: [
        new TileLayer({
          source:new TileArcGISRest({
              url:'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer'
          })
        }),
      ],
      view: this.view
    });
  }
  getMap() {
    return this.map; // 返回地图实例
  }
  getEventEmitter() {
    return eventEmitter; // 返回事件订阅实例
  }
  getLayers() {
    return this.layers; // 返回地图layers
  }
  viewMoveTo(...attrs) { // 视角移动到（）
    this._viewMoveTo(...attrs)
  }
  addLines(...attrs) {  // 添加线路  如果是 green-未行驶的则赋值到this.greenLine
    this._addLines(...attrs)
  }
  addVehicle(...attrs) {  // 添加车辆小圆点到路线上，并且渲染出绿色的未行驶的路线
    this._addVehicle(...attrs)
  }
  addPath(...attrs) { // 添加整条路
    this._addPath(...attrs)
  }
  addCarStatus(...attrs) { // 添加车辆状态的icon
    this._addCarStatus(...attrs)
  }
  addPoint(...attrs) { //仅仅添加路线开始位置的小圆点 
    this._addPoint(...attrs)
  }
  setViewLock(...attrs) {  // 用来设置播放的时候视角是否锁定
    this._setViewLock(...attrs)  
  }
  initAnimation(...attrs) {  //初始化动画, 增加监听以及键盘事件
    this._initAnimation(...attrs)
  }
  startAnimation(...attrs) { // 开始动画
    this._startAnimation(...attrs)
  }
  stopAnimation(...attrs) { // 停止动画
    this._stopAnimation(...attrs)
  }
  timeTo(...attrs) {  // 用来绑定 手动拖进度条的方法
    this._timeTo(...attrs)
  }
  back(...attrs) { // 后退10%
    this._back(...attrs);
  }
  forward(...attrs) { // 前进10%
    this._forward(...attrs);
  }
  changeSpeed(...attrs) { // 变速
    this._changeSpeed(...attrs)
  }
  removeLayer(...attrs) { //移除layer
    this._removeLayer(...attrs)
  }
  on(event, callback){  // 监听事件
    this.map.on(event, callback);
  }


  // 视角移动到（）
  _viewMoveTo(location) {
    this.view.animate({
      center: location,
      duration: 0,
    });
  }

  // 添加整条路
  _addPath(allPath, redPath) {
    this.animation.path = allPath;
    this._addLines('allPath', allPath);
    redPath.forEach(item => {
      this._addLines('red', item);
    })
    this._addPoint('point', allPath[0]);
  }

  // 添加线路  如果是 green-未行驶的则赋值到this.greenLine
  _addLines(layerName, locations) {
    if(layerName === 'green') {
      this.greenLine = new LineString(locations);
    } else {
      var line = new LineString(locations);
    }
    var newFeature = new Feature({
      geometry: line?line:this.greenLine,
      name: layerName
    });
    this._judgeExistLayer(layerName, newFeature);
  }

  //仅仅添加路线开始位置的小圆点 
  _addPoint(layerName, location) {
    var newFeature = new Feature({
      geometry: new Point(location),
      name: layerName
    });
    
    newFeature.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          img: this._createCircleCanvas(),
          imgSize: [22,22]
        }),
      })
    );
    this._judgeExistLayer(layerName, newFeature, '#B5F5D6');
  }

  // 绘制起始点的小圆圈
  _createCircleCanvas() {
    var circle = document.createElement('canvas');
    circle.setAttribute('id', "startCircle");
    var ctx=circle.getContext("2d");
    ctx.strokeStyle = '#B5F5D6'
    ctx.beginPath();
    ctx.arc(11,11,6,0,2*Math.PI);
    ctx.fillStyle = "#B5F5D6";
    ctx.fill();
    ctx.stroke();
    return circle;
  }

   // 添加车辆小圆点到路线上，并且渲染出绿色的未行驶的路线
  _addVehicle(layerName, url, location) {
    this.vehilce = new Point(location);
    this.animation.currentLocation = location;
    var newFeature = new Feature({
      geometry: this.vehilce,
      name: layerName
    });
    newFeature.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: url,
          size: [15,15]
        }),
      })
    );

    this._addLines('green', path.slice(this._findCoor(location, path), path.length));
    this._judgeExistLayer(layerName, newFeature, '#B5F5D6');
  }
  _removeLayer(layerName) {
    this.vehilce = null;
    var index = -1;
    this.layers.forEach((item, i) => {
      if (item.className_ === layerName) {
        index = i;
      }
    })
    if(index === -1) {
      console.error(`This (${layerName}) layer is not exist`);
      return;
    }
    this.map.removeLayer(this.layers[index]);
  }


  // 添加车辆状态的icon
  _addCarStatus(layerName, url, location) {
    var newFeature = new Feature({
      geometry: new Point(location),
      name: layerName
    });
    newFeature.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: url,
          size: [64,78] 
        }),
      })
    );
    this._judgeExistLayer(layerName, newFeature, '#B5F5D6');
  }

  // ======================================
  // 动画
  // 初始化动画参数
  _initAnimation(viewLock) {
    this._setDefineProperty(); // 将动画关键参数进行监听
    this._keyEvent(); // 设置键盘事件绑定
    this.animation.viewLock = viewLock; //设置视角是否锁定
  }
  // 变速
  _changeSpeed(speed) {
    this.animation.speed = speed;
  }
  _setViewLock(flag) {
    this.animation.viewLock = flag;
  }
  // 将车辆移动到（坐标信息）
  _vehicleMoveTo(coordinates) {
    if(this.vehilce) {
      this.vehilce.setCoordinates(coordinates);
      if(this.greenLine) {
        this.greenLine.setCoordinates(this._getGreenLineCoor(coordinates, this.animation.path));
      }
    } else {
      console.error('车辆资源不存在');
    }
  }
  // 将车辆移动到（index）（行驶路径中的index值）（path(index)）
  _vehicleMoveToIndex(v) {
    var index = Math.ceil(v / 100 * this.animation.path.length);
    index = index === 0 ? 1 : index;
    this.animation.currentLocation = this.animation.path[index - 1];
    this.animation.locationIndex = index - 1;
  }
  // 开始动画
  _startAnimation() {
    if(this.animation.locationIndex < 0) {
      this.animation.locationIndex = this._findCoor(this.animation.currentLocation, this.animation.path);
    }
    if(this.animation.time == 100) { // 如果结束放映进度条在最后，点击播放重新开始播放
      this.animation.time = 0;
    }
    
    this.animation.animationTimer = setInterval(() => {
      this.animation.locationIndex += this.animation.speed;

      if(this.animation.locationIndex >= this.animation.path.length) {
        this._stopAnimation();
        this.animation.locationIndex -= this.animation.speed;
        this.animation.currentLocation = this.animation.path[this.animation.path.length - 1];
        this.animation.time = 100;
        return;
      } // 判断倍速放映时是否超出进度条

      this.animation.time = this._locationToTime(this.animation.locationIndex, this.animation.path.length - 1); //主要的放映逻辑
      if(this.animation.viewLock) {
        this.viewMoveTo(this.animation.currentLocation)
      }

      if((this.animation.locationIndex + this.animation.speed) >= this.animation.path.length) {
        this._stopAnimation();
        this.animation.locationIndex -= this.animation.speed;
        this.animation.currentLocation = this.animation.path[this.animation.path.length - 1];
        this.animation.time = 100;
        return;
      } // 判断倍速放映时是否超出进度条   运动前后都判断保证没bug
    }, 1000);  //暂定两种方案， 1. 固定时间刷新，速度体现在每帧运动的坐标数  ； 2. 速度体现在每帧的时间上，每跳还是一个坐标
  }
  // 停止播放
  _stopAnimation(flag = true) {
    if(this.animation.animationTimer) {
      if(flag) {
        eventEmitter.emit("switchPlay"); // 通知进度条暂停
      }
      clearInterval(this.animation.animationTimer)
    }
  }
  // 用来绑定 手动拖进度条的方法
  _timeTo(timeValue) {
    this.animation.time = timeValue;
  }
  // 后退10%
  _back() { // todo
    this.animation.time = this.animation.time <= 10 ? 0 : this.animation.time - 10; 
  }
  // 前进10%
  _forward() { // todo
    this.animation.time = this.animation.time >= 90 ? 100 : this.animation.time + 10; 
  }

  //=================================
  //公共方法

  _judgeExistLayer(name, newFeature, color, zI) {
    var index = -1; // 用来判断该layer是否已经存在的值
    this.layers.forEach((item, i) => {
      if (item.className_ === name) {
        index = i;
      }
    })

    if(index === -1) {
      var source = new VectorSource();
      source.addFeature(newFeature)
      
      var newLayer = new VectorLayer({
        className: name,
        source: source,
      })
      var lineStyle = new Style({
        stroke: new Stroke({
          color: color || colors[name] || 'white',
          lineCap: name == 'red' ? 'square' : 'round',
          width: 7,
        }),
      })
      newLayer.setStyle(lineStyle);
      newLayer.setZIndex(zIndex[name] || zI || 0);
      this.map.addLayer(newLayer);
      this.layers.push(newLayer);
    } else {
      var tempSource = this.layers[index].getSource();
      tempSource.addFeature(newFeature)
      this.layers[index].setSource(tempSource);
    }
  }

  //找到该坐标在路径中的index
  _findCoor(coor, path) {
    var index = -1;
    for(let i = 0; i < path.length; i++) {
      index = path[i][0] === coor[0] ? path[i][1] === coor[1] ? i : -1 : -1;
      if (index > -1) {
        break;
      }
    }
    return index;
  }

  // 将this.animation.currentLocation 变为可监听的，  实现更改地址就实时将车辆图标渲染出来
  // 将this.animation.time 变为可监听的，  用来实现拖动进度条实时更改状态
  _setDefineProperty() {
    var that = this;
    
    var value = 0;
    Object.defineProperty(this.animation, 'currentLocation', {
      enumerable: true, //可否遍历
      configurable: true, //可否修改
      get: function() {
        return value;
      },
      set: function(v) {
        that._vehicleMoveTo(v);
        value = v;
      }
    })
    var timeValue = 0;
    Object.defineProperty(this.animation, 'time', {
      enumerable: true, //可否遍历
      configurable: true, //可否修改
      get: function() {
        return timeValue;
      },
      set: function(v) {
        that._vehicleMoveToIndex(v);
        eventEmitter.emit("freshTime", v);
        timeValue = v;
      }
    })
  }
  _getGreenLineCoor(coor, path) {
    var index = this._findCoor(coor, path);
    return path.slice(index, path.length);
  }
  // 用来将车辆坐标对于路径的比例换算到进度条上
  _locationToTime(curIndex, allLength) {
    var index = curIndex / allLength * 100;
    return index;
  }
  _keyEvent(){
    document.addEventListener('keydown', (e) => {
      if(e.which == 32) {
        eventEmitter.emit('switchPlay');
      } else if (e.which == 37) {
        this._back();
      } else if (e.which == 39) {
        this._forward();
      }
    });
  }
}