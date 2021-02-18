<template>
    <div class="container">
        <div class="title" v-if="isShowTitle">
            <span class="monospace">Shiny</span> 地震情报
        </div>
        <div class="earthquake-info" v-if="isShowEarthquakeInfo">
            <div class="line" v-for="line in earthquakeInfo" :key="line">
                {{ line }}
            </div>
        </div>
        <div class="shindo-container" v-if="isShowShindo && shindoInfo">
            <div class="shindo">{{ shindoInfo.shindo }}</div>
            <div class="area-list">
                <div
                    class="area-item ja"
                    v-for="area in shindoInfo.areas"
                    :key="area"
                >
                    {{ area }}
                </div>
            </div>
        </div>
    </div>
</template>
<style>
* {
    font-family: "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN",
        "Hiragino Sans GB", "华文细黑", "STHeiti", "微软雅黑", "Microsoft YaHei",
        SimHei, "Helvetica Neue", Helvetica, Arial, sans-serif;
}
body {
    background-color: rgba(0, 0, 0, 0);
}
.container {
    margin-top: 7vh;
    display: flex;
    justify-content: center;
    font-size: 2vw;
    font-weight: 900;
    color: #fff;
    text-shadow: 0 0 8px #000;
}
.title {
    letter-spacing: 0.3vw;
}
.shindo-container {
    display: flex;
}
.shindo {
    position: relative;
    margin-right: 5vw;
    z-index: 2;
}
.shindo::before {
    content: "";
    position: absolute;
    left: 0;
    top: 70%;
    width: 100%;
    height: 25%;
    background-color: rgba(0, 148, 5);
    z-index: -1;
}
.area-list {
    display: flex;
}
.area-item {
    margin-right: 5vw;
}
.area-item:last-child {
    margin-right: 0;
}
.monospace {
    font-family: Consolas, monospace;
    letter-spacing: 0;
}
.ja {
    font-family: "Noto Sans CJK JP", "Source Han Sans JP", "Source Han Sans JP",
        "ヒラギノ角ゴ Pro", "Hiragino Kaku Gothic Pro", "メイリオ", Meiryo,
        Osaka, "ＭＳ Ｐゴシック", "MS PGothic", "MS Gothic", "ＭＳ ゴシック",
        "Helvetica Neue", Helvetica, Arial, sans-serif;
}
</style>
<script>
const ShindoTextMap = {
    1: "震度1",
    2: "震度2",
    3: "震度3",
    4: "震度4",
    "5-": "震度5弱",
    "5+": "震度5强",
    "6-": "震度6弱",
    "6+": "震度6强",
    7: "震度7",
};
import io from "socket.io-client";
import sleep from "../utils/sleep";
export default {
    data() {
        return {
            earthquakeInfo: [],
            shindoInfo: {
                shindo: "",
                areas: [],
            },
            isShowTitle: false,
            isShowEarthquakeInfo: false,
            isShowShindo: false,
            isShowingEvent: false,
            delayedEvents: [],
            socketClient: null,
        };
    },
    methods: {
        async showEvent(event) {
            if (this.isShowingEvent) {
                this.delayedEvents.push(event);
                return;
            }
            this.isShowingEvent = true;
            this.isShowTitle = true;
            await sleep(2000);
            this.isShowTitle = false;
            if (event.spiderName === "shindo_early_report") {
                this.earthquakeInfo = [event.data.content.split("\n")[0]];
                this.isShowEarthquakeInfo = true;
                await sleep(5000);
                this.isShowEarthquakeInfo = false;
            }
            if (event.spiderName === "shindo_report") {
                const parsedContent = event.data.content
                    .replace(/\n\n/gi, "\n")
                    .split("\n")
                    .slice(0, 4);
                this.earthquakeInfo = [
                    parsedContent[0],
                    `${parsedContent[1]}   ${parsedContent[2]}`,
                    parsedContent[3],
                ];
                this.isShowEarthquakeInfo = true;
                await sleep(5000);
                this.isShowEarthquakeInfo = false;
            }
            if (event.spiderName === "jma" && event.data.title === "震中信息") {
                const parsedContent = event.data.content
                    .replace(/\n\n/gi, "\n")
                    .split("\n")
                    .slice(0, 4);
                this.earthquakeInfo = [
                    parsedContent[0],
                    `${parsedContent[1]}   ${parsedContent[2]}`,
                    parsedContent[3],
                ];
                this.isShowEarthquakeInfo = true;
                await sleep(5000);
                this.isShowEarthquakeInfo = false;
            }
            if (event.data.shindo) {
                const shindoLines = [];
                for (const key of [
                    "7",
                    "6+",
                    "6-",
                    "5+",
                    "5-",
                    "4",
                    "3",
                    // "2",
                    // "1",
                ]) {
                    if (!event.data.shindo[key]) {
                        continue;
                    }
                    const areas = event.data.shindo[key];
                    const line = {
                        shindo: ShindoTextMap[key],
                        areas: [],
                    };
                    for (let i = 0; i <= areas.length - 1; i++) {
                        line.areas.push(areas[i]);
                        if (i % 3 === 2) {
                            shindoLines.push({ ...line });
                            line.areas = [];
                        }
                    }
                    if (line.areas.length > 0) {
                        shindoLines.push({ ...line });
                    }
                }
                this.isShowShindo = true;
                for (const line of shindoLines) {
                    if (this.delayedEvents.length > 0) {
                        // 已有消息积压 不再继续滚动显示震度信息
                        continue;
                    } else {
                        this.shindoInfo = line;
                        await sleep(5000);
                    }
                }
                this.isShowShindo = false;
            }
            this.isShowingEvent = false;
            if (this.delayedEvents.length > 0) {
                const nextEvent = this.delayedEvents.shift();
                this.showEvent(nextEvent);
            }
        },
        onEventMessage(event) {
            if (
                event.spiderName === "shindo_report" ||
                event.spiderName === "shindo_early_report" ||
                (event.spiderName === "jma" && event.data.title === "震中信息")
            ) {
                this.showEvent(event);
            }
        },
    },
    async mounted() {
        this.socketClient = io("http://websocket.shiny.kotori.moe:3737");
        this.socketClient.on("event", async (data) => {
            // 尝试按JSON解析
            let event;
            try {
                event = JSON.parse(data);
                this.onEventMessage(event);
            } catch (e) {
                console.log("无法解析数据");
                console.log(data);
                return;
            }
        });
    },
};
</script>
